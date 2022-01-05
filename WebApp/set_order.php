<?php

require("config.php");

$pdo = new PDO('mysql:host='.$host.';dbname='.$dbname, $user, $password, array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8"));

// get the list of items id separated by cama (,)
$list_order = $_POST['Ordre'];

// convert the string list to an array
$list = explode(',' , $list_order);
$i = 1 ;
foreach($list as $id) {
	try {
	    $sql  = 'UPDATE WebApp SET Ordre = :Ordre WHERE Id = :Id' ;
		$query = $pdo->prepare($sql);
		$query->bindParam(':Ordre', $i, PDO::PARAM_INT);
		$query->bindParam(':Id', $id, PDO::PARAM_INT);
		$query->execute();
	} catch (PDOException $e) {
		echo 'PDOException : '.  $e->getMessage();
	}
	$i++ ;
}
?>
