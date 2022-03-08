<?php
	require('script/fonctions.php');
	
	$filename = $_SERVER['DOCUMENT_ROOT']."/db/WebApp.db";

    if (!file_exists($filename)) {
        createDB();
    } 
    
    $strSQL = 'SELECT "session_id" FROM "sessions" WHERE session_id ='."'".$_COOKIE["user_id"]."'";
    $resultat = requeteSQLrow($strSQL);
    
    
    if(isset($_COOKIE["user_id"])){
        if($_COOKIE["user_id"] == $resultat){
            header("Location: index.php");
        }
	}
?>

<!DOCTYPE html>
<html lang="<?php echo $language ?>">
    <head>
       <meta charset="utf-8">
        <meta name="robots" content="noindex">
		<meta name="apple-mobile-web-app-capable" content="yes">
		<link rel="stylesheet" href="style/login.css">
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
		<link rel="shortcut icon" href="img/favicon.png">
		<link rel="apple-touch-icon" href="img/favicon.png">
        <title> WebApp </title>
    </head>
    <body>
      <div id=particles-js>
        <div id="container">
            <form action="verification.php" method="POST">
                <input type="text" placeholder="<?php language(Username, Login)?>" name="username" required>
                <input type="password" placeholder="<?php language(Password, Login)?>" name="password" required>
                <select name="language" required>
                    <option value="fr-fr">Français</option>
                    <option value="en-en">English</option>
                </select>
                <div id="rememberme">
                    <input type="checkbox" name="rememberme" value="YES" checked>
                    <label for="rememberme"><?php language(rememberme, Login)?></label>
                </div>
                <input type="submit" id='submit' value=<?php language(Connection, Login)?>>
                <?php
                    if (isset($_GET['erreur'])){
                        $err = $_GET['erreur'];
                        if ($err == "LoginFailed") echo "<p style='color:red; text-align: center';>" ?><?php language(Error, Login) ?><?php "</p>";
                    }
                ?>
            </form>
        </div>
      </div>
      <script src="script/particles.js"></script>
      <script src="script/app.js"></script>
    </body>
</html>
