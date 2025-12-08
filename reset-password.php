<?php
session_start();
include 'connect.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    if (!isset($_SESSION['otp_verified_email'])) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Please verify OTP first."]);
        exit;
    }

    $email = $_SESSION['otp_verified_email'];
    $new_password = $_POST['newPassword'];

    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
    $update = $conn->prepare("UPDATE users SET password = ?, otp = NULL, otp_expiry = NULL WHERE email = ?");
    $update->bind_param("ss", $hashed_password, $email);

    if ($update->execute()) {
        unset($_SESSION['otp_verified_email']); // Clear the session variable
        echo json_encode(["success" => true, "message" => "Password has been reset successfully."]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Error resetting password."]);
    }

} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
}

$conn->close();
?>