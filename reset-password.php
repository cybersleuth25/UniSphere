<?php
session_start();
include 'connect.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $token = $_POST['token'] ?? '';
    $new_password = $_POST['newPassword'];

    // In a real application, you would validate the token and its expiry
    // For this example, we assume the token is valid and corresponds to a user
    // A secure implementation would store a reset token in the database with a timestamp
    // and a link to the user, then validate it here.
    
    // For now, let's just assume we have the user's email to update their password.
    // This is not a secure practice for a real-world application.
    $email_to_update = "user@example.com"; // Placeholder email

    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);

    $stmt = $conn->prepare("UPDATE users SET password = ? WHERE email = ?");
    $stmt->bind_param("ss", $hashed_password, $email_to_update);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Password has been reset successfully."]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error resetting password: " . $stmt->error]);
    }

} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
}

$conn->close();
?>