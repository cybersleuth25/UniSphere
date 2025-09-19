<?php
session_start();
include 'connect.php';

// Check if user is logged in
if (!isset($_SESSION['user_email'])) {
    header("Location: login.html");
    exit();
}

$user_email = $_SESSION['user_email'];
$success = "";
$error = "";

// Fetch current user info
$stmt = $conn->prepare("SELECT username, email, bio FROM users WHERE email = ?");
$stmt->bind_param("s", $user_email);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

// Update profile if form submitted
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $new_username = $_POST['username'];
    $new_email = $_POST['email'];
    $new_bio = $_POST['bio'];

    // Update user in the database
    $update = $conn->prepare("UPDATE users SET username=?, email=?, bio=? WHERE email=?");
    $update->bind_param("ssss", $new_username, $new_email, $new_bio, $user_email);

    if ($update->execute()) {
        $_SESSION['user_email'] = $new_email; // Update session email if changed
        $success = "Profile updated successfully!";
        // Refetch user data to show updated values on page
        $user_email = $new_email;
        $stmt = $conn->prepare("SELECT username, email, bio FROM users WHERE email = ?");
        $stmt->bind_param("s", $user_email);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
    } else {
        $error = "Error updating profile: " . $update->error;
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>UniSphere Profile</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@600&display=swap">
</head>
<body>
    <div class="profile-container">
        <div class="profile-card">
            <div class="profile-header">
                <div class="profile-avatar">👤</div>
                <h2>Welcome, <?php echo htmlspecialchars($user['username']); ?> 👋</h2>
            </div>
            
            <?php if (!empty($success)) echo "<p style='color: green;'>$success</p>"; ?>
            <?php if (!empty($error)) echo "<p style='color: red;'>$error</p>"; ?>

            <form method="POST">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" value="<?php echo htmlspecialchars($user['username']); ?>" required>
                </div>
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" value="<?php echo htmlspecialchars($user['email']); ?>" required>
                </div>
                <div class="form-group">
                    <label for="bio">Bio</label>
                    <textarea id="bio" name="bio" rows="4"><?php echo htmlspecialchars($user['bio'] ?? ''); ?></textarea>
                </div>
                <button type="submit" class="btn">Update Profile</button>
            </form>

            <button id="logoutBtn" class="btn secondary" style="margin-top: 20px;">Logout</button>
        </div>
    </div>
    <script src="script.js"></script>
</body>
</html>