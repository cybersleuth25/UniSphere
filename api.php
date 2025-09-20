<?php
session_start();
include 'connect.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $postType = $_GET['postType'] ?? '';
        $search = $_GET['search'] ?? '';

        if (empty($postType)) {
            echo json_encode([]);
            exit;
        }

        if (!empty($search)) {
            $searchTerm = "%{$search}%";
            $stmt = $conn->prepare("SELECT * FROM posts WHERE postType = ? AND (title LIKE ? OR description LIKE ?) ORDER BY date DESC");
            $stmt->bind_param("sss", $postType, $searchTerm, $searchTerm);
        } else {
            $stmt = $conn->prepare("SELECT * FROM posts WHERE postType = ? ORDER BY date DESC");
            $stmt->bind_param("s", $postType);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        $posts = $result->fetch_all(MYSQLI_ASSOC);
        echo json_encode($posts);
        break;

    case 'POST':
        if (!isset($_SESSION['user_email'])) {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Authentication required."]);
            exit;
        }

        $postType = $_POST['postType'];
        $author = $_SESSION['user_email'];

        if (($_SESSION['user_role'] !== 'admin') && ($postType === 'announcements' || $postType === 'events')) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Permission denied."]);
            exit;
        }

        $id = uniqid('post_');
        $title = $_POST['title'] ?? 'No Title';
        $description = $_POST['description'] ?? '';
        $date = date('Y-m-d');
        $imagePath = null;

        if (isset($_FILES['image']) && $_FILES['image']['error'] == 0) {
            $file = $_FILES['image'];
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (in_array($file['type'], $allowedTypes) && $file['size'] < 5 * 1024 * 1024) { // 5MB limit
                $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
                $filename = uniqid('postimg_', true) . '.' . $extension;
                $destination = 'uploads/' . $filename;
                if (move_uploaded_file($file['tmp_name'], $destination)) {
                    $imagePath = $destination;
                }
            }
        }

        $stmt = $conn->prepare("INSERT INTO posts (id, postType, title, description, date, author, image) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssss", $id, $postType, $title, $description, $date, $author, $imagePath);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Post created successfully."]);
        } else {
            echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
        }
        break;

    case 'PUT':
        if (!isset($_SESSION['user_email'])) { http_response_code(401); exit; }
        
        $request_body = json_decode(file_get_contents('php://input'), true);
        $id = $request_body['id'];
        $title = $request_body['title'];
        $description = $request_body['description'];
        $author = $_SESSION['user_email'];
        
        $check = $conn->prepare("SELECT author FROM posts WHERE id = ?");
        $check->bind_param("s", $id);
        $check->execute();
        $post = $check->get_result()->fetch_assoc();

        if ($post && ($post['author'] === $author || $_SESSION['user_role'] === 'admin')) {
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
        if (!isset($_SESSION['user_email'])) { http_response_code(401); exit; }
        
        $id = $_GET['id'];
        $author = $_SESSION['user_email'];
        
        $check = $conn->prepare("SELECT author FROM posts WHERE id = ?");
        $check->bind_param("s", $id);
        $check->execute();
        $post = $check->get_result()->fetch_assoc();

        if ($post && ($post['author'] === $author || $_SESSION['user_role'] === 'admin')) {
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