<?php
require('script/fonctions.php');
require('config.php');

session_start();
if(isset($_POST['username']) && isset($_POST['password']))
{

    $db = mysqli_connect($host, $user, $password,$dbname);

    $username = mysqli_real_escape_string($db,htmlspecialchars($_POST['username']));
    $password = mysqli_real_escape_string($db,htmlspecialchars($_POST['password']));
    
    var_dump($hashed_password);

    if($username !== "" && $password !== "")
    {
        $requete = "SELECT count(*) FROM user where User = '".$username."' and Password = PASSWORD('".$password."') ";
        $exec_requete = mysqli_query($db,$requete);
        $reponse = mysqli_fetch_array($exec_requete);
        $count = $reponse['count(*)'];

        if($count!=0)
        {
            $_SESSION['username'] = $username;
            header('Location: index.php');
        }
        else
        {
           header('Location: login.php?erreur=LoginFailed');
        }
    }
}
else
{
   header('Location: login.php');
}
mysqli_close($db);
?>
