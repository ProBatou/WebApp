<?php
	session_start();
	if(!isset($_SESSION["username"])){
	  header("Location: login.php");
	  exit();
	}

	session_start();
	if(isset($_GET['deconnexion']))
	{
	   if($_GET['deconnexion']==true)
	   {
	      session_unset();
	      header("location:login.php");
	   }
	}
	else if($_SESSION['username'] !== ""){
	    $user = $_SESSION['username'];
	}

	require('script/fonctions.php');
	require('config.php');
	connexionDB();
?>



<!DOCTYPE html>
<html lang="<?php echo $language ?>">
	<head>
		<title>WebApp</title>
		<meta charset="UTF-8">
		<meta name="robots" content="noindex">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<link rel="shortcut icon" href="../img/faviconB.png">
		<link rel="apple-touch-icon" href="../img/faviconW.png">
		<link rel="stylesheet" href="style/style.php">
		<link rel="stylesheet" href="style/style.css">
		<script type="text/javascript" src="script/lazysizes.js" async></script>
        <script type="text/javascript" src="script/jquery-3.6.0.min.js"></script>
        <script type="text/javascript" src="script/jquery-ui.min.js"></script>
	</head>
		<?php 
	      echo affichePageDeGarde();
	    ?>
	<body>
	    
	    <div id="context-menu">
			<div class="item" onclick="refresh()"><?php language(Refresh, context-menu)?></div>
			<div class="item" onclick="fullscreen()"><?php language(Fullscreen, context-menu)?></div>
			<div id="Manage" class="item"><?php language(ManageWebApp, context-menu)?></div>
		</div>
                <div id="context-menu-manage" class=" content draggable">
                    <div type="button" class="circle" id="CloseMenuManage"></div>
                        <ul id="sortable">
                            <?php
                                sortable();
                                global $list;
                                foreach ($list as $rs) {
                            ?>
                            <li id="<?php echo $rs['Id']; ?>" data-id="<?php echo $rs['Id']; ?>" data-nom="<?php echo $rs['Nom']; ?>" data-lien="<?php echo $rs['Lien']; ?>" data-frame="<?php echo $rs['frame']; ?>">
                                <span><img class= "icon" src="../img/<?php echo $rs['Nom'].'.png'; ?>"></span>
                                <div class= "name"><?php echo $rs['Nom']; ?></div>
                                <img class="iconmodify" src="img/iconmodify.png" type="button">
                            </li>
                            <?php
                                }
                            ?>
                        </ul>
                        <div><img id="AddMenu" class="MenuManageAjout" src="img/add.png" type="button"></div>
                </div>
                <div id="context-menu-modify" class="draggable">
                    <div type="button" class="circle" id="CloseMenuAdd"></div>
		            <form method="post" enctype="multipart/form-data">
		                <input type="hidden" id="idMenuAdd" name="idMenuAdd" value="0"></input>
			            <input id="NomMenuAdd" type="text" name="Nom" placeholder="<?php language(Name, context-menu-modify)?>">
			            <div class="file-cont">
			                <select id="selecthttp" class="label-file http" name="LienS">
                                <option value="https://">https://</option>
                                <option value="http://">http://</option>
                            </select>
                            <input id="LienMenuAdd" class="input-lien" type="text" name="Lien"  placeholder="<?php language(Link, context-menu-modify)?>"></input>
                        </div>
			            <div class="file-cont">
                            <input type="file" name="file" id="file" class="input-file"/>
                            <label for="file" class="label-file"><?php language(ModifyIcon, context-menu-modify)?></label>
                        </div>
                        <label>
                            <input id="FrameMenuAdd" type="checkbox" name="frame" value="1" checked/>
                            <label for="FrameMenuAdd" id="checkbox">View in WebApp</label>
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
				    <a href="index.php?deconnexion=true" class="icon fa logout_icon"></a>
				</li>
				</ul>
			<?php
        		echo afficheIframe();
			?>


			<script src="script/fonctions.js"></script>
		</div>
	<?php deconnexionDB(); ?>
	
<script>
    if ( window.history.replaceState ) {
        window.history.replaceState( null, null, window.location.href);
    }
</script>
</body>
</html>






