<?php
require('script/fonctions.php');

$file = 'config.php';

unlink($file);

$current = file_get_contents($file);

$current .= "<?php \n";
$current .= ('$language = "'.$_POST['language'].'";'."\n");
$current .= ('$host = "'.$_POST['IPDB'].'";'."\n");
$current .= ('$user = "'.$_POST['username'].'";'."\n");
$current .= ('$password = "'.$_POST['password'].'";'."\n");
$current .= ('$dbname = "'.$_POST['DBname'].'";'."\n");
$current .= "?> \n";

file_put_contents($file, $current);

$link = mysqli_connect($_POST['IPDB'], $_POST['username'], $_POST['password']);

$strSQL = 'DROP DATABASE '.$_POST['DBname'];
mysqli_query($link, $strSQL);

$strSQL = "CREATE DATABASE ".$_POST['DBname'];
mysqli_query($link, $strSQL);

require('config.php');

connexionDB();

$sql = "CREATE TABLE `user` (
                  `user` varchar(64) NOT NULL,
                  `password` varchar(255) NOT NULL,
                  PRIMARY KEY (`user`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
requeteSQL($sql);

$sql = "CREATE TABLE `WebApp` (
                  `Id` int(11) NOT NULL AUTO_INCREMENT,
                  `Nom` varchar(32) NOT NULL,
                  `Lien` varchar(255) NOT NULL,
                  `Ordre` int(11) NOT NULL DEFAULT 99,
                  `frame` tinyint(1) NOT NULL DEFAULT 1,
                  PRIMARY KEY (`Id`)
                ) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4;";
requeteSQL($sql);

$sql = "INSERT INTO user (user, password) VALUES ('".$_POST['username']."', PASSWORD('".$_POST['password']."'))";
requeteSQL($sql);

header('Location: login.php');

?>
















