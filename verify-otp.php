<?php
session_start();
include 'connect.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = $_POST['email'];
    $otp = $_POST['otp'];

    $stmt = $conn->prepare("SELECT otp, otp_expiry FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();

        if (strtotime($user['otp_expiry']) <= time()) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "OTP has expired."]);
            exit;
        }

        if ($user['otp'] == $otp) {
            $_SESSION['otp_verified_email'] = $email;
            echo json_encode(["success" => true, "message" => "OTP verified successfully."]);
        } else {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid OTP."]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid request."]);
    }

} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
}

$conn->close();
?>