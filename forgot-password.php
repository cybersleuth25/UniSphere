<?php
session_start();
include 'connect.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = $_POST['email'];

    // In a real application, you would generate a secure token here
    // and email the link to the user.
    $reset_token = bin2hex(random_bytes(32)); 
    
    // For now, let's just assume the email exists
    $stmt = $conn->prepare("SELECT email FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        // Return the reset URL to the frontend
        $reset_url = "reset-password.html?token=" . $reset_token;
        echo json_encode(["success" => true, "message" => "If an account exists, a reset link has been sent.", "reset_url" => $reset_url]);
    } else {
        echo json_encode(["success" => true, "message" => "If an account exists, a reset link has been sent."]);
    }

} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
}

$conn->close();
?>