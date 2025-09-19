<?php
session_start();
include 'connect.php';

// Set headers for CORS and content type
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Allow requests from any origin
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Check for authentication for all methods except GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET' && !isset($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(["error" => "Authentication required."]);
    exit;
}

// Get request method and body
$method = $_SERVER['REQUEST_METHOD'];
$request_body = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'GET':
        // No authentication needed for read operations
        $sql = "SELECT * FROM posts ORDER BY date DESC";
        $result = $conn->query($sql);
        $posts = [];
        if ($result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $posts[] = $row;
            }
        }
        echo json_encode($posts);
        break;

    case 'POST':
        $postType = $request_body['postType'];
        $author = $_SESSION['user_email']; // Set author from session

        // Authorization check for Announcements and Events
        if (($_SESSION['user_role'] !== 'admin') && ($postType === 'announcements' || $postType === 'events')) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Permission denied. Only admins can create announcements or events."]);
            exit;
        }

        $id = uniqid(); // Generate a unique ID on the server side
        $title = $request_body['title'] ?? null;
        $description = $request_body['description'] ?? null;
        $date = $request_body['date'] ?? date('Y-m-d');
        $contact = $request_body['contact'] ?? null;
        $image = $request_body['image'] ?? null;
        $urgent = $request_body['urgent'] ?? 0;
        $itemType = $request_body['itemType'] ?? null;
        $location = $request_body['location'] ?? null;

        $stmt = $conn->prepare("INSERT INTO posts (id, postType, title, description, date, contact, image, urgent, itemType, location, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssssissss", $id, $postType, $title, $description, $date, $contact, $image, $urgent, $itemType, $location, $author);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Post created successfully."]);
        } else {
            echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
        }
        $stmt->close();
        break;

    case 'PUT':
        $id = $request_body['id'];
        $title = $request_body['title'] ?? null;
        $description = $request_body['description'] ?? null;
        $contact = $request_body['contact'] ?? null;
        $image = $request_body['image'] ?? null;
        $urgent = $request_body['urgent'] ?? 0;
        $itemType = $request_body['itemType'] ?? null;
        $location = $request_body['location'] ?? null;
        $author = $_SESSION['user_email']; // Set author from session

        // Authorization check: User can only update their own posts
        $check = $conn->prepare("SELECT author FROM posts WHERE id = ?");
        $check->bind_param("s", $id);
        $check->execute();
        $result = $check->get_result();
        $post = $result->fetch_assoc();

        if ($post['author'] !== $author && $_SESSION['user_role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Permission denied. You can only update your own posts."]);
            exit;
        }

        $stmt = $conn->prepare("UPDATE posts SET title=?, description=?, contact=?, image=?, urgent=?, itemType=?, location=? WHERE id=?");
        $stmt->bind_param("sssissss", $title, $description, $contact, $image, $urgent, $itemType, $location, $id);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Post updated successfully."]);
        } else {
            echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
        }
        $stmt->close();
        break;

    case 'DELETE':
        $id = $_GET['id'];
        $author = $_SESSION['user_email']; // Set author from session

        // Authorization check: User can only delete their own posts
        $check = $conn->prepare("SELECT author FROM posts WHERE id = ?");
        $check->bind_param("s", $id);
        $check->execute();
        $result = $check->get_result();
        $post = $result->fetch_assoc();

        if ($post['author'] !== $author && $_SESSION['user_role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Permission denied. You can only delete your own posts."]);
            exit;
        }

        $stmt = $conn->prepare("DELETE FROM posts WHERE id=?");
        $stmt->bind_param("s", $id);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Post deleted successfully."]);
        } else {
            echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
        }
        $stmt->close();
        break;
}

$conn->close();
?>