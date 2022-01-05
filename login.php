<?php
	require('script/fonctions.php');
	require('config.php')
?>

<!DOCTYPE html>
<html lang="<?php echo $language ?>">
    <head>
       <meta charset="utf-8">
        <link rel="stylesheet" href="style/login.css" media="screen" type="text/css" />
        <meta name="robots" content="noindex">
        <link rel="shortcut icon" href="img/faviconB.png">
  			<link rel="apple-touch-icon" href="img/faviconW.png">
        <title> WebApp </title>
    </head>
    <body>
      <div id=particles-js>
        <div id="container">
            <form action="verification.php" method="POST">
                <input type="text" placeholder="<?php language(Username, Login)?>" name="username" required>
                <input type="password" placeholder="<?php language(Password, Login)?>" name="password" required>
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
