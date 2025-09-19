<?php
session_start();
include 'connect.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = $_POST['newUsername'];
    $email = $_POST['newEmail'];
    $password = $_POST['newPassword'];

    // Hash the password for security
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // Check if email already exists
    $check = $conn->prepare("SELECT * FROM users WHERE email = ?");
    $check->bind_param("s", $email);
    $check->execute();
    $result = $check->get_result();

    if ($result->num_rows > 0) {
        echo "⚠️ Email already registered. Try logging in.";
    } else {
        // Insert new user
        $stmt = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $username, $email, $hashed_password);

        if ($stmt->execute()) {
            $_SESSION['username'] = $username;
            $_SESSION['email'] = $email;
            header("Location: profile.html");
            exit();
        } else {
            echo "❌ Error: " . $stmt->error;
        }
    }
}
$conn->close();
?>
