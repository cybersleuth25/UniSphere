<?php
session_start();
include 'connect.php';

// Set headers for JSON response
header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = $_POST['username'];
    $password = $_POST['password'];

    // Fetch user by email
    $stmt = $conn->prepare("SELECT username, email, password, role FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows == 1) {
        $row = $result->fetch_assoc();

        // Verify password
        if (password_verify($password, $row['password'])) {
            // Set session variables
            $_SESSION['user_email'] = $row['email'];
            $_SESSION['user_role'] = $row['role']; // Assuming 'role' is a column in your 'users' table

            echo json_encode(["success" => true, "message" => "Login successful.", "user" => ["username" => $row['username'], "email" => $row['email'], "role" => $row['role']]]);
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