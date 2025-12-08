<?php
session_start();
include 'connect.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_email'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

$current_email = $_SESSION['user_email'];

// Handle avatar reset request
if (isset($_POST['avatar_path_reset'])) {
    $stmt = $conn->prepare("UPDATE users SET avatar_path = NULL WHERE email = ?");
    $stmt->bind_param("s", $current_email);
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Avatar reset successfully.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to reset avatar.']);
    }
    exit;
}

// Handle profile text updates
$new_username = $_POST['username'] ?? '';
$new_email = $_POST['email'] ?? '';
$new_bio = $_POST['bio'] ?? '';

if (empty($new_username) || empty($new_email)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Username and email cannot be empty.']);
    exit;
}

$stmt = $conn->prepare("UPDATE users SET username=?, email=?, bio=? WHERE email=?");
$stmt->bind_param("ssss", $new_username, $new_email, $new_bio, $current_email);

if ($stmt->execute()) {
    $_SESSION['user_email'] = $new_email;

    $select_stmt = $conn->prepare("SELECT username, email, role, avatar_path, bio FROM users WHERE email = ?");
    $select_stmt->bind_param("s", $new_email);
    $select_stmt->execute();
    $updated_user = $select_stmt->get_result()->fetch_assoc();

    echo json_encode(['success' => true, 'message' => 'Profile updated successfully!', 'user' => $updated_user]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error updating profile.']);
}

$stmt->close();
$conn->close();
?>