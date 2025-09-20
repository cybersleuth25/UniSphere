<?php
session_start();
if (!isset($_SESSION['username'])) {
    header("Location: login.html");
    exit();
}
include 'connect.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = $_SESSION['username'];
    $content = trim($_POST['content']);

    if (!empty($content)) {
        $stmt = $conn->prepare("INSERT INTO posts (username, content, created_at) VALUES (?, ?, NOW())");
        $stmt->bind_param("ss", $username, $content);
        $stmt->execute();
        $stmt->close();
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Post | UniSphere</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- ✅ Navbar -->
  <nav class="navbar">
    <div class="logo">UniSphere</div>
    <ul>
      <li><a href="index.php">Home</a></li>
      <li><a href="profile.php">Profile</a></li>
      <li><a href="post.php" class="active">Post</a></li>
      <li><a href="logout.php">Logout</a></li>
    </ul>
  </nav>

  <!-- ✅ Post Form -->
  <div class="container">
    <h2>Create a Post</h2>
    <form method="POST" action="">
      <textarea name="content" rows="4" placeholder="Write something..." required></textarea>
      <button type="submit" class="btn">Post</button>
    </form>

    <h3>All Posts</h3>
    <?php
    $result = $conn->query("SELECT username, content, created_at FROM posts ORDER BY created_at DESC");
    while ($row = $result->fetch_assoc()) {
        echo '<div class="post-card">';
        echo '<strong>' . htmlspecialchars($row['username']) . '</strong><br>';
        echo '<p>' . htmlspecialchars($row['content']) . '</p>';
        echo '<small>' . $row['created_at'] . '</small>';
        echo '</div>';
    }
    ?>
  </div>
</body>
</html>

