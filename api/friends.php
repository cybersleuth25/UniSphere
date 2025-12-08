<?php
session_start();
include '../connect.php'; // <-- THIS IS THE FIX

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$current_user_email = $_SESSION['user_email'] ?? null;

if (!$current_user_email) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required.']);
    exit;
}

switch ($method) {
    case 'GET':
        if (isset($_GET['checkFriendshipStatus'])) {
            $other_user_email = $_GET['checkFriendshipStatus'];
            $stmt = $conn->prepare("SELECT status, action_user_email FROM friends WHERE (user_one_email = ? AND user_two_email = ?) OR (user_one_email = ? AND user_two_email = ?)");
            $stmt->bind_param("ssss", $current_user_email, $other_user_email, $other_user_email, $current_user_email);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows > 0) {
                echo json_encode($result->fetch_assoc());
            } else {
                echo json_encode(["status" => "not_friends"]);
            }
            break;
        }

        if (isset($_GET['fetch'])) {
            if ($_GET['fetch'] === 'friends') {
                $stmt = $conn->prepare("
                    SELECT u.username, u.email, u.avatar_path, u.branch, u.semester
                    FROM users u JOIN friends f ON (u.email = f.user_one_email OR u.email = f.user_two_email)
                    WHERE (f.user_one_email = ? OR f.user_two_email = ?) AND f.status = 'accepted' AND u.email != ?
                ");
                $stmt->bind_param("sss", $current_user_email, $current_user_email, $current_user_email);
            } elseif ($_GET['fetch'] === 'requests') {
                 $stmt = $conn->prepare("
                    SELECT u.username, u.email, u.avatar_path, u.branch, u.semester
                    FROM users u JOIN friends f ON u.email = f.action_user_email
                    WHERE (f.user_one_email = ? OR f.user_two_email = ?) AND f.status = 'pending' AND f.action_user_email != ?
                ");
                $stmt->bind_param("sss", $current_user_email, $current_user_email, $current_user_email);
            }
            $stmt->execute();
            $data = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            echo json_encode($data);
            break;
        }

        if (isset($_GET['searchUsers'])) {
            $searchTerm = "%" . $_GET['searchUsers'] . "%";
            $stmt = $conn->prepare("SELECT username, email, bio, avatar_path, branch, semester FROM users WHERE username LIKE ? AND email != ?");
            $stmt->bind_param("ss", $searchTerm, $current_user_email);
            $stmt->execute();
            $users = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            echo json_encode($users);
            break;
        }
        break;

    case 'POST':
        $other_user_email = $_POST['email'];
        $friendAction = $_POST['friendAction'];

        if ($friendAction === 'add') {
            $stmt = $conn->prepare("INSERT INTO friends (user_one_email, user_two_email, status, action_user_email) VALUES (?, ?, 'pending', ?)");
            $stmt->bind_param("sss", $current_user_email, $other_user_email, $current_user_email);
        } elseif ($friendAction === 'accept') {
            $stmt = $conn->prepare("UPDATE friends SET status = 'accepted', action_user_email = ? WHERE ((user_one_email = ? AND user_two_email = ?) OR (user_one_email = ? AND user_two_email = ?)) AND status = 'pending'");
            $stmt->bind_param("sssss", $current_user_email, $current_user_email, $other_user_email, $other_user_email, $current_user_email);
        } elseif (in_array($friendAction, ['decline', 'remove', 'cancel'])) {
            $stmt = $conn->prepare("DELETE FROM friends WHERE (user_one_email = ? AND user_two_email = ?) OR (user_one_email = ? AND user_two_email = ?)");
            $stmt->bind_param("ssss", $current_user_email, $other_user_email, $other_user_email, $current_user_email);
        }
        
        if (isset($stmt) && $stmt->execute()) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["success" => false, "message" => isset($stmt) ? $stmt->error : "Invalid action"]);
        }
        break;
}

$conn->close();
?>