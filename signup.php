<?php
session_start();
include 'connect.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = $_POST['newUsername'];
    $email = $_POST['newEmail'];
    $password = $_POST['newPassword'];
    $role = 'student';
    $branch = $_POST['branch'];
    $semester = $_POST['semester'];

    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    $check = $conn->prepare("SELECT email FROM users WHERE email = ?");
    $check->bind_param("s", $email);
    $check->execute();
    $result = $check->get_result();

    if ($result->num_rows > 0) {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "Email already registered. Try logging in."]);
    } else {
        // THE FIX IS ON THIS LINE: The 'i' for integer was changed to 's' for string.
        $stmt = $conn->prepare("INSERT INTO users (username, email, password, role, branch, semester) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("ssssss", $username, $email, $hashed_password, $role, $branch, $semester);

        if ($stmt->execute()) {
            $_SESSION['user_email'] = $email;
            $_SESSION['user_role'] = $role;
            $user_data = [
                "username" => $username,
                "email" => $email,
                "role" => $role,
                "branch" => $branch,
                "semester" => $semester
            ];
            echo json_encode(["success" => true, "message" => "Account created successfully.", "user" => $user_data]);
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