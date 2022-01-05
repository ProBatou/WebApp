<?php
	require('script/fonctions.php');
	require('config.php');
	connexionDB();
?>

<!DOCTYPE html>
<html>
	<head>
		<title>WebApp</title>
		<meta charset="UTF-8">
		<meta name="robots" content="noindex">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta name="apple-mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
		<link rel="shortcut icon" href="../img/faviconB.png">
		<link rel="apple-touch-icon" href="../img/faviconW.png">
		<link rel="stylesheet" href="style/reset.css">
		<link rel="stylesheet" href="style/styleInstaller.css">
		<script src="script/lazysizes.js" async></script>
        <script src="script/jquery-3.6.0.min.js"></script>
        <script src="script/jquery-ui.min.js"></script>
	</head>
	
<body>
    <div>WebApp V.0.1</div>
        <form action="writedb.php" method="POST" id="container">
        <select name="language" required>
            <option value="" disabled selected>Select your language</option>
            <option value="en-en" lang="en">English</option>
            <option value="fr-fr" lang="fr">Français</option>
        </select>
        <input type="text" placeholder="IP of the DB" name="IPDB" value="<?php echo $host ?>" required>
        <input type="text" placeholder="username for db" name="username" value="<?php echo $user ?>" required>
        <input type="text" placeholder="Password for the db" name="password" value="<?php echo $password ?>" required>
        <input type="text" placeholder="DB Name" name="DBname" value="<?php echo $dbname ?>" required>
        <input type="file" name="file" id="file" accept=".csv">
        <input type="submit" id='submit' value='Submit'>
        </form>
        
        <button onclick="location.href='exportDB.php'">Export last DB</button>
</body>