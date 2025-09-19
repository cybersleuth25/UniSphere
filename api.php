<?php
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

// Database connection details
$servername = "localhost";
$username = "root"; // Default XAMPP username
$password = ""; // Default XAMPP password
$dbname = "unisphere";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    echo json_encode(["error" => "Connection failed: " . $conn->connect_error]);
    exit;
}

// Get request method and body
$method = $_SERVER['REQUEST_METHOD'];
$request_body = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'GET':
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
        $id = $request_body['id'];
        $postType = $request_body['postType'];
        $title = $request_body['title'] ?? null;
        $description = $request_body['description'] ?? null;
        $date = $request_body['date'] ?? date('Y-m-d');
        $contact = $request_body['contact'] ?? null;
        $image = $request_body['image'] ?? null;
        $urgent = $request_body['urgent'] ?? 0;
        $itemType = $request_body['itemType'] ?? null;
        $location = $request_body['location'] ?? null;
        $author = $request_body['author'] ?? 'student';

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