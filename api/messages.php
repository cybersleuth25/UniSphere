<?php
session_start();
include '../connect.php';

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

function getUserDetails($conn, $email) {
    $stmt = $conn->prepare("SELECT username, email, avatar_path, branch, semester FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    return $stmt->get_result()->fetch_assoc();
}

switch ($method) {
    case 'GET':
        if (isset($_GET['fetch'])) {
            $data = [];
            if ($_GET['fetch'] === 'conversations') {
                $stmt = $conn->prepare("
                    SELECT 
                        c.id as conversation_id,
                        (SELECT message FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                        (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_email != ? AND is_read = 0) as unread_count,
                        IF(c.user_one_email = ?, c.user_two_email, c.user_one_email) as other_user_email
                    FROM conversations c
                    WHERE c.user_one_email = ? OR c.user_two_email = ?
                    ORDER BY (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) DESC
                ");
                $stmt->bind_param("ssss", $current_user_email, $current_user_email, $current_user_email, $current_user_email);
                $stmt->execute();
                $result = $stmt->get_result();
                while($row = $result->fetch_assoc()){
                    $row['other_user'] = getUserDetails($conn, $row['other_user_email']);
                    $data[] = $row;
                }
                echo json_encode($data);
                exit;

            } elseif ($_GET['fetch'] === 'messages') {
                $conversation_id = $_GET['conversation_id'];
                
                $update_stmt = $conn->prepare("UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_email != ?");
                $update_stmt->bind_param("is", $conversation_id, $current_user_email);
                $update_stmt->execute();

                $stmt = $conn->prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC");
                $stmt->bind_param("i", $conversation_id);
                $stmt->execute();
                $data = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                echo json_encode($data);
                exit;
            }
        }
        break;

    case 'POST':
        $action = $_POST['action'] ?? null;
        switch ($action) {
            case 'startConversation':
                $other_user_email = $_POST['email'];
                $user1 = min($current_user_email, $other_user_email);
                $user2 = max($current_user_email, $other_user_email);
                
                $stmt = $conn->prepare("SELECT id FROM conversations WHERE user_one_email = ? AND user_two_email = ?");
                $stmt->bind_param("ss", $user1, $user2);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if($result->num_rows > 0) {
                    $conversation = $result->fetch_assoc();
                    echo json_encode(['success' => true, 'conversation_id' => $conversation['id']]);
                } else {
                    $stmt = $conn->prepare("INSERT INTO conversations (user_one_email, user_two_email) VALUES (?, ?)");
                    $stmt->bind_param("ss", $user1, $user2);
                    if ($stmt->execute()) {
                        echo json_encode(['success' => true, 'conversation_id' => $conn->insert_id]);
                    } else {
                        echo json_encode(['success' => false, 'message' => 'Failed to create conversation.']);
                    }
                }
                break;
            
            case 'sendMessage':
                $conversation_id = $_POST['conversationId'];
                $message = trim($_POST['message']);
                if (empty($message)) break;

                $stmt = $conn->prepare("INSERT INTO messages (conversation_id, sender_email, message) VALUES (?, ?, ?)");
                $stmt->bind_param("iss", $conversation_id, $current_user_email, $message);
                if($stmt->execute()){
                    echo json_encode(['success' => true]);
                } else {
                    echo json_encode(['success' => false]);
                }
                break;
        }
        break;
}

$conn->close();
?>