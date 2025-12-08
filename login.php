<?php
session_start();
include 'connect.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = $_POST['username'];
    $password = $_POST['password'];

    // This query now also fetches the avatar_path
    $stmt = $conn->prepare("SELECT username, email, password, role, avatar_path FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows == 1) {
        $row = $result->fetch_assoc();

        if (password_verify($password, $row['password'])) {
            $_SESSION['user_email'] = $row['email'];
            $_SESSION['user_role'] = $row['role'];

            // We now include avatar_path in the data sent to the browser
            $user_data = [
                "username" => $row['username'],
                "email" => $row['email'],
                "role" => $row['role'],
                "avatar_path" => $row['avatar_path']
            ];

            echo json_encode(["success" => true, "message" => "Login successful.", "user" => $user_data]);
        } else {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Invalid password."]);
        }
    } else {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "No account found with this email."]);
    }
} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
}

$conn->close();
?>