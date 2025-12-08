<?php
session_start();
include '../connect.php'; 

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$is_admin = (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin');
$current_user_email = $_SESSION['user_email'] ?? null;

switch ($method) {
    case 'GET':
        if (isset($_GET['recommendationsForPost'])) {
            $postId = $_GET['recommendationsForPost'];
            $stmt = $conn->prepare("SELECT title FROM posts WHERE id = ?");
            $stmt->bind_param("s", $postId);
            $stmt->execute();
            $post = $stmt->get_result()->fetch_assoc();

            if ($post) {
                $keywords = explode(' ', $post['title']);
                $searchQuery = implode(' ', array_slice($keywords, 0, 5));
                $stmt = $conn->prepare("SELECT id, title, postType FROM posts WHERE MATCH(title, description) AGAINST (? IN BOOLEAN MODE) AND id != ? LIMIT 3");
                $stmt->bind_param("ss", $searchQuery, $postId);
                $stmt->execute();
                $recommendations = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                echo json_encode($recommendations);
            } else {
                echo json_encode([]);
            }
            exit;
        }

        $postType = $_GET['postType'] ?? '';
        if (empty($postType)) { echo json_encode([]); exit; }
        
        $params = [];
        $types = '';
        $user_email_for_query = $current_user_email ?? '';
        $sql = "SELECT p.*, (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_email = ?) as liked_by_user FROM posts p WHERE p.postType = ?";
        $params[] = $user_email_for_query;
        $params[] = $postType;
        $types .= 'ss';

        if (!empty($_GET['search'])) {
            $sql .= " AND MATCH(p.title, p.description) AGAINST (? IN BOOLEAN MODE)";
            $params[] = $_GET['search'];
            $types .= 's';
        }
        if (!empty($_GET['category'])) {
            $sql .= " AND p.category = ?";
            $params[] = $_GET['category'];
            $types .= 's';
        }
        if (!empty($_GET['status'])) {
            $sql .= " AND p.status = ?";
            $params[] = $_GET['status'];
            $types .= 's';
        }
        if (!empty($_GET['cost_type'])) {
            $sql .= " AND p.cost_type = ?";
            $params[] = $_GET['cost_type'];
            $types .= 's';
        }

        $sql .= " ORDER BY p.date DESC, p.created_at DESC";
        
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $result = $stmt->get_result();
            $posts = [];
            while ($row = $result->fetch_assoc()) {
                $row['liked_by_user'] = (bool)$row['liked_by_user'];
                $posts[] = $row;
            }
            echo json_encode($posts);
        } else {
            http_response_code(500);
            echo json_encode(['error' => $conn->error]);
        }
        break;

    case 'POST':
        if (!$current_user_email) { http_response_code(401); echo json_encode(["success" => false, "message" => "Authentication required."]); exit; }
        
        if (isset($_POST['likePostId'])) {
            $postId = $_POST['likePostId'];
            $conn->begin_transaction();
            try {
                $check_like_stmt = $conn->prepare("SELECT id FROM likes WHERE post_id = ? AND user_email = ?");
                $check_like_stmt->bind_param("ss", $postId, $current_user_email);
                $check_like_stmt->execute();
                $liked = $check_like_stmt->get_result()->num_rows > 0;
                $check_like_stmt->close();
        
                if ($liked) {
                    $update_post_stmt = $conn->prepare("UPDATE posts SET likes = likes - 1 WHERE id = ?");
                    $update_post_stmt->bind_param("s", $postId);
                    $update_post_stmt->execute();
                    $update_post_stmt->close();

                    $delete_like_stmt = $conn->prepare("DELETE FROM likes WHERE post_id = ? AND user_email = ?");
                    $delete_like_stmt->bind_param("ss", $postId, $current_user_email);
                    $delete_like_stmt->execute();
                    $delete_like_stmt->close();
                } else {
                    $update_post_stmt = $conn->prepare("UPDATE posts SET likes = likes + 1 WHERE id = ?");
                    $update_post_stmt->bind_param("s", $postId);
                    $update_post_stmt->execute();
                    $update_post_stmt->close();

                    $insert_like_stmt = $conn->prepare("INSERT INTO likes (post_id, user_email) VALUES (?, ?)");
                    $insert_like_stmt->bind_param("ss", $postId, $current_user_email);
                    $insert_like_stmt->execute();
                    $insert_like_stmt->close();
                }
        
                $likes_count_stmt = $conn->prepare("SELECT likes FROM posts WHERE id = ?");
                $likes_count_stmt->bind_param("s", $postId);
                $likes_count_stmt->execute();
                $likes_count = $likes_count_stmt->get_result()->fetch_assoc()['likes'] ?? 0;
                $likes_count_stmt->close();
                
                $conn->commit();
                echo json_encode(["success" => true, "likes" => $likes_count]);
            } catch (Exception $e) {
                $conn->rollback();
                echo json_encode(["success" => false, "message" => "Could not update like."]);
            }
            break;
        }

        $postType = $_POST['postType'];
        $admin_only_posts = ['announcements', 'events'];

        if (!$is_admin && in_array($postType, $admin_only_posts)) {
            http_response_code(403); 
            echo json_encode(["success" => false, "message" => "You do not have permission."]);
            exit;
        }

        $author = $current_user_email;
        $id = uniqid('post_');
        $title = $_POST['title'] ?? 'No Title';
        $description = $_POST['description'] ?? '';
        $date = date('Y-m-d H:i:s');
        $status = $_POST['status'] ?? null;
        $category = $_POST['category'] ?? null;
        $cost_type = $_POST['cost_type'] ?? null;
        
        $imagePath = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] == 0) {
            $filename = uniqid('postimg_', true) . '.' . pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
            $destination = '../uploads/' . $filename;
            if (move_uploaded_file($_FILES['image']['tmp_name'], $destination)) {
                $imagePath = 'uploads/' . $filename;
            }
        }
        
        $filePath = null;
        if (isset($_FILES['postFile']) && $_FILES['postFile']['error'] == 0) {
            $file_filename = uniqid('postfile_', true) . '_' . basename($_FILES['postFile']['name']);
            $file_destination = '../uploads/' . $file_filename;
            if (move_uploaded_file($_FILES['postFile']['tmp_name'], $file_destination)) {
                $filePath = 'uploads/' . $file_filename;
            }
        }

        $stmt = $conn->prepare("INSERT INTO posts (id, postType, title, description, date, author, image, file_path, status, category, cost_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssssssss", $id, $postType, $title, $description, $date, $author, $imagePath, $filePath, $status, $category, $cost_type);
        
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Post created successfully."]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Database error: " . $stmt->error]);
        }
        break;

    case 'PUT':
        if (!$current_user_email) { http_response_code(401); exit; }
        $request_body = json_decode(file_get_contents('php://input'), true);
        $id = $request_body['id'];
        $title = $request_body['title'];
        $description = $request_body['description'];
        
        $check = $conn->prepare("SELECT author FROM posts WHERE id = ?");
        $check->bind_param("s", $id);
        $check->execute();
        $post = $check->get_result()->fetch_assoc();

        if ($post && ($is_admin || $post['author'] === $current_user_email)) {
            $stmt = $conn->prepare("UPDATE posts SET title = ?, description = ? WHERE id = ?");
            $stmt->bind_param("sss", $title, $description, $id);
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Post updated successfully."]);
            } else {
                echo json_encode(["success" => false, "message" => "Update failed."]);
            }
        } else {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Permission denied."]);
        }
        break;

    case 'DELETE':
        if (!$current_user_email) { http_response_code(401); exit; }
        
        $id = $_GET['id'];
        
        $check = $conn->prepare("SELECT author FROM posts WHERE id = ?");
        $check->bind_param("s", $id);
        $check->execute();
        $post = $check->get_result()->fetch_assoc();

        if ($post && ($is_admin || $post['author'] === $current_user_email)) {
            $stmt = $conn->prepare("DELETE FROM posts WHERE id = ?");
            $stmt->bind_param("s", $id);
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Post deleted successfully."]);
            } else {
                echo json_encode(["success" => false, "message" => "Delete failed."]);
            }
        } else {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Permission denied."]);
        }
        break;
}

$conn->close();
?>