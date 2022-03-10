<?php


function check_update() {

    $version = file_get_contents('version.txt');
    $versiongithub = exec('curl --silent -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/ProBatou/WebApp/releases/latest | grep -oP '. "'(?<=".'"tag_name": ")[^"]*'."' | sed 's/^v//'");
     
    if (version_compare($version, $versiongithub) < 0) {
        echo "NEED_UPDATE";
    }
}



function sortable() {
    $strSQL = 'SELECT * FROM AppList ORDER BY Ordre ASC';
    $resultat = requeteSQL($strSQL);
    $list = $resultat->fetchArray();
}

function createDB() {
    
    $db = new SQLite3($_SERVER['DOCUMENT_ROOT']."/db/WebApp.db");
    
    $strSQL =  "CREATE TABLE IF NOT EXISTS `sessions` (";
    $strSQL.=  "`session_id` int(11) NOT NULL,";
    $strSQL.=  "`session_expire` varchar(20) NOT NULL,";
    $strSQL.=  "`language` TEXT);";

    $db->query($strSQL);
    
    $strSQL =  "CREATE TABLE IF NOT EXISTS `user` (";
    $strSQL.=  "user varchar(64) NOT NULL,";
    $strSQL.=  "password varchar(255) NOT NULL,";
    $strSQL.=  "PRIMARY KEY (user));";
    
    $db->query($strSQL);
    
    $strSQL =  "CREATE TABLE IF NOT EXISTS `AppList` (";
    $strSQL.=  "`Id` integer primary key autoincrement,";
    $strSQL.=  "`Nom` varchar(32) NOT NULL,";
    $strSQL.=  "`Lien` varchar(255) NOT NULL,'Ordre' NUMERIC NOT NULL DEFAULT 99,";
    $strSQL.=  "`frame` tinyint(1) NOT NULL DEFAULT 1);";

    $db->query($strSQL);
}

function requeteSQL($strSQL) {
    
    $db = new SQLite3($_SERVER['DOCUMENT_ROOT']."/db/WebApp.db");

    $result = $db->query($strSQL);

	return $result;
}

function requeteSQLrow($strSQL) {
    
    $db = new SQLite3($_SERVER['DOCUMENT_ROOT']."/db/WebApp.db");
    $result = $db->querySingle($strSQL);
	return $result;
}

function afficheDiv() {
    $menu_retour = isset($menu_retour) ? $menu_retour : '';
	// Sélectionne toutes les pages filles de la page en cours
	$strSQL = 'SELECT `Id` FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	while ($tabl_result = $resultat->fetchArray()) {
		$menu_retour .= '<div id="t'.$tabl_result['Id'].'">'."\n";
	}
	return $menu_retour;
}



function afficheUl() {
    $menu_retour = isset($menu_retour) ? $menu_retour : '';
	// Sélectionne toutes les pages filles de la page en cours
	$strSQL = 'SELECT `Id`, `Nom`,`frame`, `Lien` FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	$menu_retour = '<ul id="menu">';

	while ($tabl_result = $resultat->fetchArray()) {
	    if ($tabl_result['frame'] == '1'){
		$menu_retour .= '<li id="'.$tabl_result['Id'].'" data-id="'.$tabl_result['Id'].'" data-nom="'.$tabl_result['Nom'].'" data-lien="'.$tabl_result['Lien'].'" data-frame="'.$tabl_result['frame'].'"><a href="#t'.$tabl_result['Id'].'" class="icon '.$tabl_result['Nom'].'_icon" id="m'.$tabl_result['Id'].'"></a></li>'."\n";
	    }
	    else {
	        $menu_retour .= '<li id="'.$tabl_result['Id'].'" data-id="'.$tabl_result['Id'].'" data-nom="'.$tabl_result['Nom'].'" data-lien="'.$tabl_result['Lien'].'" data-frame="'.$tabl_result['frame'].'"><a href="#t1" onclick= window.open(\''.$tabl_result['Lien'].'\') class="icon '.$tabl_result['Nom'].'_icon" id="m'.$tabl_result['Id'].'"></a></li>'."\n";
	    }
	}
	return $menu_retour;
}



function afficheIframe() {
    $menu_retour = isset($menu_retour) ? $menu_retour : '';
	// Sélectionne toutes les pages filles de la page en cours
	$strSQL = 'SELECT `Id`, `Lien` FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	while ($tabl_result = $resultat->fetchArray()) {
	    $menu_retour .= '<div class="page" id="p'.$tabl_result['Id'].'"><iframe name="m'.$tabl_result['Id'].'" class="iframe lazyload" loading="lazy" data-src="'.$tabl_result['Lien'].'"></iframe></div>'."\n";
	}
	return $menu_retour;
}



function afficheIconCss() {
    $menu_retour = isset($menu_retour) ? $menu_retour : '';
	$strSQL = 'SELECT `Id`, `Nom` FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	while ($tabl_result = $resultat->fetchArray()) {

    $filename = "../img/custom/".$tabl_result['Nom'].".png";

    if (file_exists($filename)) {
        $menu_retour .= '.'.$tabl_result['Nom'].'_icon {'."\n".'content: url("../img/custom/'.$tabl_result['Nom'].'.png" )'."\n".'}'."\n";
    } 
    else {
        $menu_retour .= '.'.$tabl_result['Nom'].'_icon {'."\n".'content: url("../img/default/'.$tabl_result['Nom'].'.png" )'."\n".'}'."\n";
    }
	}
	return $menu_retour;
}



function afficheTargetCss() {
    $menu_retour = isset($menu_retour) ? $menu_retour : '';
	$strSQL = 'SELECT `Id` FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	$strSQL = 'SELECT COUNT(*) FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
    $numResults = requeteSQLrow($strSQL);
    $counter = 0;
    
    while ($tabl_result = $resultat->fetchArray()) {
    if ($numResults == ++$counter) {
        $menu_retour .= '#t'.$tabl_result['Id'].':target #m'.$tabl_result['Id'].' {'."\n".'transform: scale(1);'."\n".'}'."\n";
    } 
    else {
	        $menu_retour .= '#t'.$tabl_result['Id'].':target #m'.$tabl_result['Id'].','."\n";
        }
    }
    return $menu_retour;
}



function afficheTargetIconCss() {
    $menu_retour = isset($menu_retour) ? $menu_retour : '';
	$strSQL = 'SELECT `Id` FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	$strSQL = 'SELECT COUNT(*) FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
    $numResults = requeteSQLrow($strSQL);
    $counter = 0;
    
    while ($tabl_result = $resultat->fetchArray()) {
    if ($numResults == ++$counter) {
        $menu_retour .= '#t'.$tabl_result['Id'].':target ul .icon {'."\n".'transform: scale(.6);'."\n".'}'."\n";
    } 
    else {
	        $menu_retour .= '#t'.$tabl_result['Id'].':target ul .icon,'."\n";
        }
    }
    return $menu_retour;
}



function affichePCss() {
    $menu_retour = isset($menu_retour) ? $menu_retour : '';
	$strSQL = 'SELECT `Id` FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	$strSQL = 'SELECT COUNT(*) FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
    $numResults = requeteSQLrow($strSQL);
    $counter = 0;
    
    while ($tabl_result = $resultat->fetchArray()) {
    if ($numResults == ++$counter) {
        $menu_retour .= '#p'.$tabl_result['Id'].' {'."\n".'left: 200%;'."\n".'}'."\n";
    } 
    else {
	        $menu_retour .= '#p'.$tabl_result['Id'].',';
        }
    }
    return $menu_retour;
}



function afficheTTargetPP() {
    $menu_retour = isset($menu_retour) ? $menu_retour : '';
	$strSQL = 'SELECT `Id` FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);

    $strSQL = 'SELECT COUNT(*) FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
    $numResults = requeteSQLrow($strSQL);
    $counter = 0;
    
while ($tabl_result = $resultat->fetchArray()) {
    if ($numResults == ++$counter) {
        $menu_retour .= '#t'.$tabl_result['Id'].':target #p'.$tabl_result['Id'].'{'."\n".'transform: translateX(-200%);'."\n".'transition-delay: .1s;'."\n".'}'."\n";
    } 
    else {
	    $menu_retour .= '#t'.$tabl_result['Id'].':target #p'.$tabl_result['Id'].','."\n";
    }
}
    return $menu_retour;
}



function affichePageDeGarde() {
    $menu_retour = isset($menu_retour) ? $menu_retour : '';
	$strSQL = 'SELECT `Id` FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	$strSQL = 'SELECT COUNT(*) FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
    $numResults = requeteSQLrow($strSQL);
	$tabl_result = $resultat->fetchArray();
    $menu_retour .= '<script> location.href = "#t'.$tabl_result['Id'].'" </script>';
    return $menu_retour;
}

function endDiv() {
    $menu_retour = isset($menu_retour) ? $menu_retour : '';
	// Sélectionne toutes les pages filles de la page en cours
	$strSQL = 'SELECT `Id`, `Lien` FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	while ($tabl_result = $resultat->fetchArray()) {
	    $menu_retour .= '</div>'."\n";
	}
	return $menu_retour;
}



if (isset($_POST['add']) && isset($_POST['modify'])) {
    
$txtName = $_POST['Nom'];

$system_dir = $_SERVER['DOCUMENT_ROOT']."/img/system/";
$default_dir = $_SERVER['DOCUMENT_ROOT']."/img/default/";
$custom_dir = $_SERVER['DOCUMENT_ROOT']."/img/custom/";
$target_file = $custom_dir . basename($_FILES["file"]["name"]);

$uploadOk = 1;
$imageFileType = strtolower(pathinfo($target_file,PATHINFO_EXTENSION));

$db = new SQLite3($_SERVER['DOCUMENT_ROOT']."/db/WebApp.db");

// Check if image file is a actual image or fake image
if(isset($_POST['add']) && isset($_POST['modify'])) {
  $check = getimagesize($_FILES["file"]["tmp_name"]);
    if($check !== false) {
        $uploadOk = 1;
    } 
    else {
        $uploadOk = 0;
    }
}

// Check file size
if ($_FILES["file"]["size"] > 2097152) {
  $uploadOk = 0;
}

// Check file empty
if ($_FILES["file"]["size"] == 0) {
    
    if (file_exists($custom_dir . $txtName . ".png") or file_exists($default_dir . $txtName . ".png")) {
        $uploadOk = 0;
    }
    else {
        copy($system_dir . "default.png", $custom_dir . $txtName . ".png");
        $uploadOk = 0;
    }
}

// Allow certain file formats
if($imageFileType != "jpg" && $imageFileType != "png" && $imageFileType != "jpeg" ) {
  $uploadOk = 0;
}

// Check if $uploadOk is set to 0 by an error
if (!$uploadOk == 0) {
    move_uploaded_file($_FILES["file"]["tmp_name"], $custom_dir.$txtName.".png");
}


if ($_POST['idMenuAdd'] == "0"){

$txtName = $_POST['Nom'];
$txtLien = $_POST['LienS'] . $_POST['Lien'];


if(isset($_POST['frame']) && $_POST['frame'] <> '') 
{
    $txtFrame = 1;
}
else
{
    $txtFrame = 0;
}

$strSQL = 'SELECT COUNT(*) FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
$numResults = requeteSQLrow($strSQL);
$numResults = ++$numResults;

// database insert SQL code
$strSQL = 'INSERT INTO `AppList` VALUES ( NULL, "'.$txtName.'",  "'.$txtLien.'", "'.$numResults.'", "'.$txtFrame.'")';
// insert in database 
requeteSQL($strSQL);

}
else {

$txtId = $_POST['idMenuAdd'];
$txtName = $_POST['Nom'];
$txtLien = $_POST['LienS'] . $_POST['Lien'];

if(isset($_POST['frame']) && $_POST['frame'] <> '') {
    $txtFrame = 1;
}
else {
    $txtFrame = 0;
}

$strSQL = 'SELECT COUNT(*) FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
$numResults = requeteSQLrow($strSQL);
$numResults = ++$numResults;

// database insert SQL code
$strSQL = 'UPDATE `AppList` SET  Nom="'.$txtName.'",  Lien="'.$txtLien.'",  frame="'.$txtFrame.'" WHERE Id= '.$txtId.'';
// insert in database 
requeteSQL($strSQL);
}
}



if (isset($_POST['Delete'])) {

$db = new SQLite3($_SERVER['DOCUMENT_ROOT']."/db/WebApp.db");

$txtId = $_POST['idMenuAdd'];
$txtName = $_POST['Nom'];

$strSQL = 'SELECT COUNT(*) FROM `AppList` WHERE `Id` ORDER BY `Ordre`';
$numResults = requeteSQLrow($strSQL);
$numResults = ++$numResults;

// Delete Id SQL code
$strSQL = 'DELETE FROM `AppList` WHERE `Id` = '.$txtId.';';
$strSQL.= 'SET  @num := 0;';
$strSQL.= 'UPDATE AppList SET Id = @num := (@num+1);';
$strSQL.= 'ALTER TABLE AppList AUTO_INCREMENT = 1';
        
// insert in database 
requeteSQL($strSQL);

$filename = ('img/custom/'.$txtName . '.png');

unlink($filename);
}


function language($item_recherche, $groupe_recherche){

if(!isset($_COOKIE["user_id"])){

    $resultat = substr($_SERVER['HTTP_ACCEPT_LANGUAGE'], 0, 2);
    $fichier="language/".$resultat.".ini";

    if(!file_exists($fichier)){
        $resultat = "en";
    }

}
else{
    $strSQL = 'SELECT "language" FROM "sessions" WHERE session_id ='."'".$_COOKIE["user_id"]."'";
    $resultat = requeteSQLrow($strSQL);
}

$fichier="language/".$resultat.".ini";

if(file_exists($fichier) && $fichier_lecture=file($fichier))
   foreach($fichier_lecture as $ligne)
   {
     $ligne_propre=trim($ligne);
     if(preg_match("#^\[(.+)\]$#",$ligne_propre,$matches))
        $groupe=$matches[1];
     else
        if($ligne_propre[0]!=';')
            if($groupe==$groupe_recherche)
                if(strpos($ligne,$item_recherche."=")===0)
                    $valeur=end(explode("=",$ligne,2));
                elseif($ligne==$item_recherche)
                    $valeur='';
   }
    echo $valeur;
}


function lang(){

    if(isset($_COOKIE["user_id"])){
        $strSQL = 'SELECT "language" FROM "sessions" WHERE session_id ='."'".$_COOKIE["user_id"]."'";
        $resultat = requeteSQLrow($strSQL);
    }
    else{
        $resultat = substr($_SERVER['HTTP_ACCEPT_LANGUAGE'], 0, 2);
    }
    echo $resultat;
}



?>















