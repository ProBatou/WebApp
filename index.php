<?php

    session_start();
    require('script/fonctions.php');
    
    if(!isset($_COOKIE["user_id"])){
        header("Location: login.php");
	    exit();
	}
	else{
	    
	    $strSQL = 'SELECT "session_id" FROM "sessions" WHERE session_id ='."'".$_COOKIE["user_id"]."'";
        $resultat = requeteSQLrow($strSQL);
        
	    if($_COOKIE["user_id"] !== $resultat){
	        header("Location: login.php");
	    }
	}
	
	if(isset($_GET['deconnexion'])){
	    
	   if($_GET['deconnexion']==true){
            setcookie("user_id", "", time()-3600, "/", $_SERVER['HTTP_HOST'], true, true);
            $strSQL = 'DELETE FROM "sessions" WHERE session_id ='."'".$_COOKIE["user_id"]."'";
            requeteSQLrow($strSQL);
            session_unset();
	        header("location:login.php");
	   }
	}
	
	$strSQL = 'DELETE FROM "sessions" WHERE session_expire < '.strtotime("now");
	requeteSQL($strSQL);

?>



<!DOCTYPE html>
<html lang="<?php lang()?>">
	<head>
		<title>WebApp</title>
		<meta charset="UTF-8">
		<meta name="robots" content="noindex">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta name="apple-mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
		<link rel="shortcut icon" href="img/favicon.png">
		<link rel="apple-touch-icon" href="img/favicon.png">
		<link rel="stylesheet" href="style/reset.css">
		<link rel="stylesheet" href="style/style.css">
		<link rel="stylesheet" href="style/style.php">
		<script src="script/lazysizes.js" async></script>
        <script src="script/jquery-3.6.0.min.js"></script>
        <script src="script/jquery-ui.min.js"></script>
        <?php 
	      echo affichePageDeGarde();
	    ?>
	</head>
	<body>
	    
	    <div id="virtual"></div>
	    
	    <div id="context-menu">
			<div class="item" onclick="refresh()"><?php language(Refresh, context-menu)?></div>
			<div class="item" onclick="fullscreen()"><?php language(Fullscreen, context-menu)?></div>
			<div id="Add" class="item"><?php language(Add, context-menu)?></div>
			<div id="Modify" class="item"><?php language(Modify, context-menu)?></div>
		</div>

		<div id="popup">
 			<a id="popup-header"><?php language(updateavailable, popup)?></a>
 			<div id="popup-button">
 				<button id="popup-update" onclick="update()"><?php language(run, popup)?></button>
 				<button id="popup-later" onclick="hidepopup()"><?php language(later, popup)?></button>
 			</div>
 		</div>
                
                <div id="context-menu-modify" class="draggable">
                    <div class="header-context-menu-manage-modify">
                        <h5><?php language(SetupApp, context-menu-modify)?></h5>
                        <a class="circle" id="CloseMenuAdd"></a>
                    </div>
		            <form method="post" enctype="multipart/form-data">
		                <input type="hidden" id="idMenuAdd" name="idMenuAdd" value="0">
			            <input id="NomMenuAdd" type="text" name="Nom" placeholder="<?php language(Name, context-menu-modify)?>">
			            <div class="file-cont">
			                <select id="selecthttp" class="label-file http" name="LienS">
                                <option value="https://">https://</option>
                                <option value="http://">http://</option>
                            </select>
                            <input id="LienMenuAdd" class="input-lien" type="text" name="Lien"  placeholder="<?php language(Link, context-menu-modify)?>">
                        </div>
			            <div class="file-cont">
                            <input type="file" name="file" id="file" class="input-file"/>
                            <label for="file" class="label-file"><?php language(ModifyIcon, context-menu-modify)?></label>
                        </div>
                        <label>
                            <input id="FrameMenuAdd" type="checkbox" name="frame" value="1" checked/>
                            <label for="FrameMenuAdd" id="checkbox">Iframe or not</label>
                        </label>
			            <input id="submitadd" type="submit" name="add" value=<?php language(Add, context-menu-modify)?> class="submit">
			            <input id="submitmodify" type="hidden" name="modify" value=<?php language(Modify, context-menu-modify)?> class="submit">
			            <input id="delete" type="submit" name="Delete" value="<?php language(Delete, context-menu-modify)?>" class="delete">
		            </form>
		        </div>

		<div id="t0">
			<?php
        		echo afficheDiv();
				echo afficheUl();
			?>
			    <li class="disconnect">
				    <a href="index.php?deconnexion=true" class="icon logout_icon"></a>
				</li>
				</ul>
			<?php
        		echo afficheIframe();
        		echo endDiv();
			?>


			<script src="script/fonctions.js"></script>

			<script>

				if ("<?php check_update(); ?>" == "NEED_UPDATE"){
    				if(getCookie("popup_update") == "HIDE"){
        				hidepopup();
    				}
   					 else{
        				popup.style.transform = "translateX(-100%)";
    				}   
				}
			</script>


		</div>
	
<script>
    if ( window.history.replaceState ) {
        window.history.replaceState( null, null, window.location.href);
    }
</script>
</body>
</html>






