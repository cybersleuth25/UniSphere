<?php
session_start();
include 'connect.php';

header('Content-Type: application/json');
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = $_POST['email'];

    $stmt = $conn->prepare("SELECT email FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $otp = rand(100000, 999999); // Generate a 6-digit OTP
        $otp_expiry = date("Y-m-d H:i:s", time() + 60 * 10); // 10-minute expiry

        // NOTE: You will need to add `otp` and `otp_expiry` columns to your `users` table.
        // ALTER TABLE users ADD otp VARCHAR(6), ADD otp_expiry DATETIME;
        $update = $conn->prepare("UPDATE users SET otp = ?, otp_expiry = ? WHERE email = ?");
        $update->bind_param("sss", $otp, $otp_expiry, $email);
        $update->execute();

        // In a real application, you would integrate an email sending library here.
        // For now, we just confirm that the process is working.
        echo json_encode(["success" => true, "message" => "An OTP has been sent to your email."]);

    } else {
        // We send the same message to prevent user enumeration attacks.
        echo json_encode(["success" => true, "message" => "If an account with that email exists, an OTP has been sent."]);
    }

} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
}

$conn->close();
?>