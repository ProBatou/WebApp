<?php

$pdo = new SQLite3($_SERVER['DOCUMENT_ROOT']."/db/WebApp.db");

// get the list of items id separated by cama (,)
$list_order = $_POST['Ordre'];

// convert the string list to an array
$list = explode(',' , $list_order);
$i = 1 ;
foreach($list as $id) {
	try {
	    $sql  = 'UPDATE AppList SET Ordre = :Ordre WHERE Id = :Id' ;
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
