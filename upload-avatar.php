<?php
session_start();
include 'connect.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required.']);
    exit;
}

if (isset($_FILES['avatar'])) {
    $file = $_FILES['avatar'];

    // File validation
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!in_array($file['type'], $allowedTypes)) {
        echo json_encode(['success' => false, 'message' => 'Invalid file type. Please upload a JPG, PNG, or GIF.']);
        exit;
    }

    if ($file['size'] > 2 * 1024 * 1024) { // 2MB limit
        echo json_encode(['success' => false, 'message' => 'File is too large. Maximum size is 2MB.']);
        exit;
    }

    // Generate unique filename and move the file
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid('avatar_', true) . '.' . $extension;
    $destination = 'uploads/' . $filename;

    if (move_uploaded_file($file['tmp_name'], $destination)) {
        // Update database with the new avatar path
        $user_email = $_SESSION['user_email'];
        $stmt = $conn->prepare("UPDATE users SET avatar_path = ? WHERE email = ?");
        $stmt->bind_param("ss", $destination, $user_email);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Avatar updated successfully!', 'filepath' => $destination]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update database.']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to move uploaded file.']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'No file uploaded.']);
}

$conn->close();
?>