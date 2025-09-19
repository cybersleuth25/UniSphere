<?php
session_start();
include 'connect.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: login.html");
    exit();
}

$user_id = $_SESSION['user_id'];

// Fetch current user info
$stmt = $conn->prepare("SELECT username, email FROM users WHERE id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

// Update profile if form submitted
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $new_username = $_POST['username'];
    $new_email = $_POST['email'];

    $update = $conn->prepare("UPDATE users SET username=?, email=? WHERE id=?");
    $update->bind_param("ssi", $new_username, $new_email, $user_id);

    if ($update->execute()) {
        $_SESSION['username'] = $new_username;
        $_SESSION['email'] = $new_email;
        $success = "Profile updated successfully!";
    } else {
        $error = "Error updating profile.";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Profile</title>
    <style>
        body { font-family: Arial, sans-serif; background: #101528; color: white; text-align: center; }
        .box { margin: 100px auto; width: 400px; padding: 20px; background: #1c2331; border-radius: 10px; }
        input { width: 90%; padding: 10px; margin: 10px 0; border: none; border-radius: 5px; }
        button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .msg { margin-top: 10px; color: lightgreen; }
        .err { margin-top: 10px; color: red; }
    </style>
</head>
<body>
    <div class="box">
        <h2>Welcome, <?php echo htmlspecialchars($_SESSION['username']); ?> 👋</h2>
        
        <form method="POST">
            <input type="text" name="username" value="<?php echo htmlspecialchars($user['username']); ?>" required>
            <input type="email" name="email" value="<?php echo htmlspecialchars($user['email']); ?>" required>
            <button type="submit">Update Profile</button>
        </form>

        <?php if (isset($success)) echo "<p class='msg'>$success</p>"; ?>
        <?php if (isset($error)) echo "<p class='err'>$error</p>"; ?>

        <br>
        <a href="logout.php" style="color: red;">Logout</a>
    </div>
</body>
</html>
