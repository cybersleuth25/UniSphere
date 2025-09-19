<?php
session_start();
include 'connect.php';

// Set headers for JSON response
header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = $_POST['newUsername'];
    $email = $_POST['newEmail'];
    $password = $_POST['newPassword'];
    $role = 'student'; // Default role for new users

    // Hash the password for security
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // Check if email already exists
    $check = $conn->prepare("SELECT email FROM users WHERE email = ?");
    $check->bind_param("s", $email);
    $check->execute();
    $result = $check->get_result();

    if ($result->num_rows > 0) {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "Email already registered. Try logging in."]);
    } else {
        // Insert new user, including the 'role'
        $stmt = $conn->prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $username, $email, $hashed_password, $role);

        if ($stmt->execute()) {
            $_SESSION['user_email'] = $email;
            $_SESSION['user_role'] = $role;
            echo json_encode(["success" => true, "message" => "Account created successfully.", "user" => ["username" => $username, "email" => $email, "role" => $role]]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error creating account: " . $stmt->error]);
        }
    }
} else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
}

$conn->close();
?>