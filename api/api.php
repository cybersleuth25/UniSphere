<?php
session_start();
include 'connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$is_admin = (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin');
$current_user_email = $_SESSION['user_email'] ?? null;

function getUserDetails($conn, $email) {
    $stmt = $conn->prepare("SELECT username, email, avatar_path, branch, semester FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    return $stmt->get_result()->fetch_assoc();
}

switch ($method) {
    case 'GET':
        if (isset($_GET['recommendationsForPost'])) {
            $postId = $_GET['recommendationsForPost'];

            // Get the title of the original post
            $stmt = $conn->prepare("SELECT title FROM posts WHERE id = ?");
            $stmt->bind_param("s", $postId);
            $stmt->execute();
            $result = $stmt->get_result();
            $post = $result->fetch_assoc();

            if ($post) {
                // A simple way to get keywords: split the title into words
                $keywords = explode(' ', $post['title']);
                $searchQuery = implode(' ', array_slice($keywords, 0, 5)); // Use first 5 words

                // Find other posts that match these keywords
                $stmt = $conn->prepare("SELECT id, title, description, postType FROM posts WHERE MATCH(title, description) AGAINST (? IN BOOLEAN MODE) AND id != ? LIMIT 3");
                $stmt->bind_param("ss", $searchQuery, $postId);
                $stmt->execute();
                $recommendations = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

                echo json_encode($recommendations);
            } else {
                echo json_encode([]);
            }
            exit;
        }
        
        if (isset($_GET['checkFriendshipStatus'])) {
            if (!$current_user_email) { http_response_code(401); exit; }
            $other_user_email = $_GET['checkFriendshipStatus'];
            $stmt = $conn->prepare("SELECT status, action_user_email FROM friends WHERE (user_one_email = ? AND user_two_email = ?) OR (user_one_email = ? AND user_two_email = ?)");
            $stmt->bind_param("ssss", $current_user_email, $other_user_email, $other_user_email, $current_user_email);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows > 0) {
                echo json_encode($result->fetch_assoc());
            } else {
                echo json_encode(["status" => "not_friends"]);
            }
            exit;
        }

        if (isset($_GET['fetch'])) {
            if (!$current_user_email) { http_response_code(401); exit; }
            $data = [];
            if ($_GET['fetch'] === 'friends') {
                $stmt = $conn->prepare("
                    SELECT u.username, u.email, u.avatar_path, u.branch, u.semester
                    FROM users u JOIN friends f ON (u.email = f.user_one_email OR u.email = f.user_two_email)
                    WHERE (f.user_one_email = ? OR f.user_two_email = ?) AND f.status = 'accepted' AND u.email != ?
                ");
                $stmt->bind_param("sss", $current_user_email, $current_user_email, $current_user_email);
            } elseif ($_GET['fetch'] === 'requests') {
                 $stmt = $conn->prepare("
                    SELECT u.username, u.email, u.avatar_path, u.branch, u.semester
                    FROM users u JOIN friends f ON u.email = f.action_user_email
                    WHERE (f.user_one_email = ? OR f.user_two_email = ?) AND f.status = 'pending' AND f.action_user_email != ?
                ");
                $stmt->bind_param("sss", $current_user_email, $current_user_email, $current_user_email);
            } elseif ($_GET['fetch'] === 'conversations') {
                $data = []; 
                $stmt = $conn->prepare("
                    SELECT 
                        c.id as conversation_id,
                        (SELECT message FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_email != ? AND is_read = 0) as unread_count,
                        IF(c.user_one_email = ?, c.user_two_email, c.user_one_email) as other_user_email
                    FROM conversations c
                    WHERE c.user_one_email = ? OR c.user_two_email = ?
                    ORDER BY (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) DESC
                ");
                // The typo was here. Changed "sssss" to "ssss" to match the 4 question marks in the query.
                $stmt->bind_param("ssss", $current_user_email, $current_user_email, $current_user_email, $current_user_email);
                $stmt->execute();
                $result = $stmt->get_result();
                while($row = $result->fetch_assoc()){
                    $row['other_user'] = getUserDetails($conn, $row['other_user_email']);
                    $data[] = $row;
                }
                echo json_encode($data);
                exit;

            } elseif ($_GET['fetch'] === 'messages') {
                $conversation_id = $_GET['conversation_id'];
                
                $update_stmt = $conn->prepare("UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_email != ?");
                $update_stmt->bind_param("is", $conversation_id, $current_user_email);
                $update_stmt->execute();

                $stmt = $conn->prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC");
                $stmt->bind_param("i", $conversation_id);
            }
            $stmt->execute();
            $data = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            echo json_encode($data);
            exit;
        }
        
        if (isset($_GET['globalSearch'])) {
            $searchTerm = "%" . $_GET['globalSearch'] . "%";
            $results = ['posts' => [], 'users' => []];
            $stmt_posts = $conn->prepare("SELECT id, title, description, postType FROM posts WHERE MATCH(title, description) AGAINST (? IN BOOLEAN MODE)");
            $stmt_posts->bind_param("s", $_GET['globalSearch']);
            $stmt_posts->execute();
            $results['posts'] = $stmt_posts->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt_users = $conn->prepare("SELECT username, email, bio, avatar_path, branch, semester FROM users WHERE username LIKE ?");
            $stmt_users->bind_param("s", $searchTerm);
            $stmt_users->execute();
            $results['users'] = $stmt_users->get_result()->fetch_all(MYSQLI_ASSOC);
            echo json_encode($results);
            exit;

        } elseif (isset($_GET['searchUsers'])) {
            $searchTerm = "%" . $_GET['searchUsers'] . "%";
            $stmt = $conn->prepare("SELECT username, email, bio, avatar_path, branch, semester FROM users WHERE username LIKE ? AND email != ?");
            $stmt->bind_param("ss", $searchTerm, $current_user_email);
            $stmt->execute();
            $users = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            echo json_encode($users);
            exit;

        } else {
            $postType = $_GET['postType'] ?? '';
            if (empty($postType)) { echo json_encode([]); exit; }
            
            $params = [];
            $types = '';

            $sql = "SELECT p.*, (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_email = ?) as liked_by_user FROM posts p WHERE p.postType = ?";
            $params[] = $current_user_email;
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
        }
        break;

    case 'POST':
        if (!$current_user_email) { http_response_code(401); echo json_encode(["success" => false, "message" => "Authentication required."]); exit; }
        
        $action = $_POST['action'] ?? null;
        if (isset($_POST['friendAction'])) $action = 'friendAction';
        if (isset($_POST['likePostId'])) $action = 'likePost';

        switch ($action) {
            case 'friendAction':
                $other_user_email = $_POST['email'];
                $friendAction = $_POST['friendAction'];

                if ($friendAction === 'add') {
                    $stmt = $conn->prepare("INSERT INTO friends (user_one_email, user_two_email, status, action_user_email) VALUES (?, ?, 'pending', ?)");
                    $stmt->bind_param("sss", $current_user_email, $other_user_email, $current_user_email);
                } elseif ($friendAction === 'accept') {
                    $stmt = $conn->prepare("UPDATE friends SET status = 'accepted', action_user_email = ? WHERE ((user_one_email = ? AND user_two_email = ?) OR (user_one_email = ? AND user_two_email = ?)) AND status = 'pending'");
                    $stmt->bind_param("sssss", $current_user_email, $current_user_email, $other_user_email, $other_user_email, $current_user_email);
                } elseif ($friendAction === 'decline' || $friendAction === 'remove' || $friendAction === 'cancel') {
                    $stmt = $conn->prepare("DELETE FROM friends WHERE (user_one_email = ? AND user_two_email = ?) OR (user_one_email = ? AND user_two_email = ?)");
                    $stmt->bind_param("ssss", $current_user_email, $other_user_email, $other_user_email, $current_user_email);
                }
                
                if (isset($stmt) && $stmt->execute()) {
                    echo json_encode(["success" => true]);
                } else {
                    echo json_encode(["success" => false, "message" => isset($stmt) ? $stmt->error : "Invalid action"]);
                }
                break;
            
            case 'likePost':
                $postId = $_POST['likePostId'];
                $conn->begin_transaction();
                try {
                    $check_like_stmt = $conn->prepare("SELECT id FROM likes WHERE post_id = ? AND user_email = ?");
                    $check_like_stmt->bind_param("is", $postId, $current_user_email);
                    $check_like_stmt->execute();
                    $liked = $check_like_stmt->get_result()->num_rows > 0;
                    $check_like_stmt->close();
            
                    if ($liked) {
                        $update_post_stmt = $conn->prepare("UPDATE posts SET likes = likes - 1 WHERE id = ?");
                        $update_post_stmt->bind_param("i", $postId);
                        $update_post_stmt->execute();
                        $update_post_stmt->close();
            
                        $delete_like_stmt = $conn->prepare("DELETE FROM likes WHERE post_id = ? AND user_email = ?");
                        $delete_like_stmt->bind_param("is", $postId, $current_user_email);
                        $delete_like_stmt->execute();
                        $delete_like_stmt->close();
                    } else {
                        $update_post_stmt = $conn->prepare("UPDATE posts SET likes = likes + 1 WHERE id = ?");
                        $update_post_stmt->bind_param("i", $postId);
                        $update_post_stmt->execute();
                        $update_post_stmt->close();
            
                        $insert_like_stmt = $conn->prepare("INSERT INTO likes (post_id, user_email) VALUES (?, ?)");
                        $insert_like_stmt->bind_param("is", $postId, $current_user_email);
                        $insert_like_stmt->execute();
                        $insert_like_stmt->close();
                    }
            
                    $likes_count_stmt = $conn->prepare("SELECT likes FROM posts WHERE id = ?");
                    $likes_count_stmt->bind_param("i", $postId);
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


            case 'startConversation':
                $other_user_email = $_POST['email'];
                $user1 = min($current_user_email, $other_user_email);
                $user2 = max($current_user_email, $other_user_email);
                
                $stmt = $conn->prepare("SELECT id FROM conversations WHERE user_one_email = ? AND user_two_email = ?");
                $stmt->bind_param("ss", $user1, $user2);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if($result->num_rows > 0) {
                    $conversation = $result->fetch_assoc();
                    echo json_encode(['success' => true, 'conversation_id' => $conversation['id']]);
                } else {
                    $stmt = $conn->prepare("INSERT INTO conversations (user_one_email, user_two_email) VALUES (?, ?)");
                    $stmt->bind_param("ss", $user1, $user2);
                    if ($stmt->execute()) {
                        echo json_encode(['success' => true, 'conversation_id' => $conn->insert_id]);
                    } else {
                        echo json_encode(['success' => false, 'message' => 'Failed to create conversation.']);
                    }
                }
                break;
            
            case 'sendMessage':
                $conversation_id = $_POST['conversationId'];
                $message = trim($_POST['message']);
                if (empty($message)) break;

                $stmt = $conn->prepare("INSERT INTO messages (conversation_id, sender_email, message) VALUES (?, ?, ?)");
                $stmt->bind_param("iss", $conversation_id, $current_user_email, $message);
                if($stmt->execute()){
                    echo json_encode(['success' => true]);
                } else {
                    echo json_encode(['success' => false]);
                }
                break;

            default: 
                $postType = $_POST['postType'];
                $admin_only_posts = ['announcements', 'events'];

                if (!$is_admin && in_array($postType, $admin_only_posts)) {
                    http_response_code(403); 
                    echo json_encode(["success" => false, "message" => "You do not have permission to create this type of post."]);
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
                    $destination = 'uploads/' . $filename;
                    if (move_uploaded_file($_FILES['image']['tmp_name'], $destination)) {
                        $imagePath = $destination;
                    }
                }
                $stmt = $conn->prepare("INSERT INTO posts (id, postType, title, description, date, author, image, status, category, cost_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->bind_param("ssssssssss", $id, $postType, $title, $description, $date, $author, $imagePath, $status, $category, $cost_type);
                if ($stmt->execute()) {
                     if ($postType === 'events' || $postType === 'announcements') {
                        $notification_message = "New " . rtrim($postType, 's') . ": " . $title;
                        $conn->query("INSERT INTO notifications (user_email, message, type) SELECT email, '$notification_message', '$postType' FROM users WHERE email != '$author'");
                    }
                    echo json_encode(["success" => true, "message" => "Post created."]);
                } else {
                    echo json_encode(["success" => false, "message" => "Error."]);
                }
                break;
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