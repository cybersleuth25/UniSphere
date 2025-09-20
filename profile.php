<?php
session_start();
include 'connect.php';

if (!isset($_SESSION['user_email'])) {
    header("Location: login.html");
    exit();
}

$current_user_email = $_SESSION['user_email'];
$user = null;
// FIXED: Added the 'role' column to the database query
$stmt = $conn->prepare("SELECT username, email, bio, avatar_path, role FROM users WHERE email = ?");
$stmt->bind_param("s", $current_user_email);
if ($stmt->execute()) {
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>UniSphere Profile</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@600&display=swap">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>
<body class="profile-page-body">

    <div id="particles-js"></div>

    <div class="profile-container">
        <div class="profile-avatar-wrapper">
            <img src="" alt="Profile Avatar" id="profileAvatarImg" class="profile-avatar">
            <input type="file" id="avatarUploadInput" style="display: none;" accept="image/png, image/jpeg, image/gif">
            <button id="uploadAvatarBtn" class="avatar-control-btn" title="Upload a new avatar">
                <i class="fas fa-upload"></i>
            </button>
            <button id="changeAvatarBtn" class="avatar-control-btn" title="Get a new generated avatar">
                <i class="fas fa-sync-alt"></i>
            </button>
        </div>
        
        <h1 id="welcomeHeading">Hello, <?php echo htmlspecialchars($user['username']); ?></h1>
        <p id="emailSubheading" class="subheading"><?php echo htmlspecialchars($user['email']); ?></p>
        
        <div class="profile-page-actions">
            <button id="editProfileBtn" class="btn secondary">Edit Profile</button>
            <a href="index.html" class="btn secondary">Main Page</a>
            <a href="logout.php" class="btn secondary">Logout</a>
        </div>
    </div>

    <div id="editProfileModal" class="modal">
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h2>Edit Profile</h2>
            <form id="editProfileForm">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" required>
                </div>
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div class="form-group">
                    <label for="bio">Bio</label>
                    <textarea id="bio" name="bio" rows="4" placeholder="Tell us a little about yourself..."></textarea>
                </div>
                <button type="submit" class="btn">Update Profile</button>
            </form>
        </div>
    </div>
    
    <script> const serverData = { user: <?php echo json_encode($user); ?> }; </script>
    <script src="script.js"></script>
</body>
</html>