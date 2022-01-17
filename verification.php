<?php
require('script/fonctions.php');
require('config.php');

if(isset($_POST['username']) && isset($_POST['password']))
{

    $db = mysqli_connect($host, $user, $password,$dbname);

    $username = mysqli_real_escape_string($db,htmlspecialchars($_POST['username']));
    $password = mysqli_real_escape_string($db,htmlspecialchars($_POST['password']));
    
    if($username !== "" && $password !== "")
    {
        $requete = "SELECT count(*) FROM user where User = '".$username."' and Password = PASSWORD('".$_POST['password']."') ";
        $exec_requete = mysqli_query($db,$requete);
        $reponse = mysqli_fetch_array($exec_requete);
        $count = $reponse['count(*)'];

        if($count!=0)
        {
            $_SESSION['username'] = $username;
            
            if ($_POST['rememberme'] == 'YES'){
                setcookie("user_id", $sessionid, strtotime('+1 months'), "/", $_SERVER['HTTP_HOST'], true, true);
            }
            else{
                setcookie("user_id", "jesuisuncookiemanuel", time()+3600, "/", $_SERVER['HTTP_HOST'], true, true);
            }
            
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
