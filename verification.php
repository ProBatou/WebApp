<?php
require('script/fonctions.php');

if(isset($_POST['username']) && isset($_POST['password'])){
    
    $db = new SQLite3($_SERVER['DOCUMENT_ROOT']."/db/WebApp.db");
    $username = $_POST['username'];
    
    $password = $_POST['password'];
    $password_hash = password_hash($_POST['password'], PASSWORD_BCRYPT);
    
    if($username !== "" && $password !== ""){
        
        $strSQL = 'SELECT "password" FROM "user" WHERE user = '."'".$username."'";
        $resultat = requeteSQLrow($strSQL);
        
        if(password_verify($password,$resultat)){
            
            if ($_POST['rememberme'] == 'YES'){
                
                $randString = substr(md5(openssl_random_pseudo_bytes(20)),-50);/////////////////////////////// PAS sur de ca
                
                setcookie("user_id", $randString, strtotime('+1 months'), "/", $_SERVER['HTTP_HOST'], true, true);
                $strSQL = "INSERT INTO `sessions` VALUES ('".$randString."', '".strtotime('+1 months')."', '".$_POST['language']."')";
                $resultat = requeteSQL($strSQL);
                
            }
            else{
                
                $randString = substr(md5(openssl_random_pseudo_bytes(20)),-50);/////////////////////////////// PAS sur de ca
                
                setcookie("user_id", $randString, strtotime('+1 days'), "/", $_SERVER['HTTP_HOST'], true, true);
                $strSQL = "INSERT INTO `sessions` VALUES ('".$randString."', '".strtotime('+1 days')."')";
                $resultat = requeteSQL($strSQL);
                
            }

            header('Location: index.php');
            
        }
        else{
            
            $strSQL = 'SELECT COUNT(*) FROM `user`';
            $resultat = requeteSQLrow($strSQL);
            if($resultat == 0){
                $strSQL = "INSERT INTO user VALUES ('".$username."', '".$password_hash."')";
                $resultat = requeteSQL($strSQL);
                header('Location: index.php');
            }
            else{
                header('Location: login.php?erreur=LoginFailed');
            }
            
               
            
        }
    }
}
else{
   header('Location: login.php');
}
?>
