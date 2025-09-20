<?php
session_start();
include 'connect.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $token = $_POST['token'] ?? '';
    $new_password = $_POST['newPassword'];

    if (empty($token) || empty($new_password)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Token and password are required."]);
        exit;
    }

    $token_hash = hash('sha256', $token);

    $stmt = $conn->prepare("SELECT email, reset_token_expiry FROM users WHERE reset_token = ?");
    $stmt->bind_param("s", $token_hash);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        
        // Check if token is expired
        if (strtotime($user['reset_token_expiry']) <= time()) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Reset link has expired."]);
            exit;
        }

        // Token is valid, update the password and clear the token
        $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
        $update = $conn->prepare("UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE email = ?");
        $update->bind_param("ss", $hashed_password, $user['email']);

        if ($update->execute()) {
            echo json_encode(["success" => true, "message" => "Password has been reset successfully."]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error resetting password."]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid reset link."]);
    }

} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
}

$conn->close();
?>