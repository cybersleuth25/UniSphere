<?php
session_start();
include 'connect.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = $_POST['username'];  // in your form it's username/email
    $password = $_POST['password'];

    // Fetch user by email
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows == 1) {
        $row = $result->fetch_assoc();

        // Verify password
        if (password_verify($password, $row['password'])) {
            $_SESSION['username'] = $row['username'];
            $_SESSION['email'] = $row['email'];
            header("Location: profile.html");
            exit();
        } else {
            echo "❌ Invalid password.";
        }
    } else {
        echo "❌ No account found with this email.";
    }
}
$conn->close();
?>