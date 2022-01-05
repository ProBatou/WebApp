<?php



function connexionDB() {
    require($_SERVER['DOCUMENT_ROOT']."/config.php");
    global $link;
	$link = mysqli_connect($host, $user, $password, $dbname);
}



function deconnexionDB() {
    global $link;
	mysqli_close($link);
}



function sortable(){
    global $list;
    $strSQL = 'SELECT * FROM WebApp ORDER BY Ordre ASC';
    $resultat = requeteSQL($strSQL);
    $list = mysqli_fetch_all($resultat, MYSQLI_ASSOC);
}



function requeteSQL($strSQL) {
    global $link;
	$result = mysqli_query($link, $strSQL);
	if (!$result) {
		$message  = 'Erreur SQL : ' . mysqli_error() . "<br>\n";
		$message .= 'SQL string : ' . $strSQL . "<br>\n";
		$message .= "Merci d'envoyer ce message au webmaster";
		die($message);
	}
	return $result;
}



function afficheDiv() {
    $menu_retour = isset($menu_retour) ? $menu_retour : '';
	// Sélectionne toutes les pages filles de la page en cours
	$strSQL = 'SELECT `Id` FROM `WebApp` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	while ($tabl_result = mysqli_fetch_array($resultat)) {
		$menu_retour .= '<div id="t'.$tabl_result['Id'].'">'."\n";
	}
	return $menu_retour;
}



function afficheUl() {
    $menu_retour = isset($menu_retour) ? $menu_retour : '';
	// Sélectionne toutes les pages filles de la page en cours
	$strSQL = 'SELECT `Id`, `Nom`,`frame`, `Lien` FROM `WebApp` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	$menu_retour = '<ul id="menu">';
	while ($tabl_result = mysqli_fetch_array($resultat)) {
	    if ($tabl_result['frame'] == '1'){
		$menu_retour .= '<li><a href="#t'.$tabl_result['Id'].'" class="icon '.$tabl_result['Nom'].'_icon" id="m'.$tabl_result['Id'].'"></a></li>'."\n";
	    }
	    else {
	        $menu_retour .= '<li><a href="#t1" onclick= window.open(\''.$tabl_result['Lien'].'\') class="icon '.$tabl_result['Nom'].'_icon" id="m'.$tabl_result['Id'].'"></a></li>'."\n";
	    }
	}
	return $menu_retour;
}



function afficheIframe() {
    $menu_retour = isset($menu_retour) ? $menu_retour : '';
	// Sélectionne toutes les pages filles de la page en cours
	$strSQL = 'SELECT `Id`, `Lien` FROM `WebApp` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	while ($tabl_result = mysqli_fetch_array($resultat)) {
	    $menu_retour .= '<div class="page" id="p'.$tabl_result['Id'].'"><iframe name="m'.$tabl_result['Id'].'" class="iframe lazyload" loading="lazy" data-src="'.$tabl_result['Lien'].'"></iframe></div>'."\n";
	}
	return $menu_retour;
}



function afficheIconCss() {
    $menu_retour = isset($menu_retour) ? $menu_retour : '';
	$strSQL = 'SELECT `Id`, `Nom` FROM `WebApp` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	while ($tabl_result = mysqli_fetch_array($resultat)) {
	    $menu_retour .= '.'.$tabl_result['Nom'].'_icon {'."\n".'content: url("../img/'.$tabl_result['Nom'].'.png" )'."\n".'}'."\n";

	}
	return $menu_retour;
}



function afficheTargetCss() {
    $menu_retour = isset($menu_retour) ? $menu_retour : '';
	$strSQL = 'SELECT `Id` FROM `WebApp` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	$numResults = mysqli_num_rows($resultat);
    $counter = 0;
    
    while ($tabl_result = mysqli_fetch_array($resultat)) {
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
	$strSQL = 'SELECT `Id` FROM `WebApp` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	$numResults = mysqli_num_rows($resultat);
    $counter = 0;
    
    while ($tabl_result = mysqli_fetch_array($resultat)) {
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
	$strSQL = 'SELECT `Id` FROM `WebApp` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	$numResults = mysqli_num_rows($resultat);
    $counter = 0;
    
    while ($tabl_result = mysqli_fetch_array($resultat)) {
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
	$strSQL = 'SELECT `Id` FROM `WebApp` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	$numResults = mysqli_num_rows($resultat);
    $counter = 0;
    
    while ($tabl_result = mysqli_fetch_array($resultat)) {
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
	$strSQL = 'SELECT `Id` FROM `WebApp` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	$numResults = mysqli_num_rows($resultat);
	$tabl_result = mysqli_fetch_array($resultat);
    $menu_retour .= '<script> location.href = "#t'.$tabl_result['Id'].'" </script>';
    return $menu_retour;
}

function endDiv() {
    $menu_retour = isset($menu_retour) ? $menu_retour : '';
	// Sélectionne toutes les pages filles de la page en cours
	$strSQL = 'SELECT `Id`, `Lien` FROM `WebApp` WHERE `Id` ORDER BY `Ordre`';
	$resultat = requeteSQL($strSQL);
	while ($tabl_result = mysqli_fetch_array($resultat)) {
	    $menu_retour .= '</div>'."\n";
	}
	return $menu_retour;
}



if (isset($_POST['add']) && isset($_POST['modify'])) {
    
$txtName = $_POST['Nom'];

$target_dir = $_SERVER['DOCUMENT_ROOT']."/img/";
$target_file = $target_dir . basename($_FILES["file"]["name"]);

$uploadOk = 1;
$imageFileType = strtolower(pathinfo($target_file,PATHINFO_EXTENSION));

require("config.php");
$link = mysqli_connect($host, $user, $password, $dbname);

// Check if image file is a actual image or fake image
if(isset($_POST['add']) && isset($_POST['modify'])) {
  $check = getimagesize($_FILES["file"]["tmp_name"]);
    if($check !== false) {
        echo("<script>console.log('File is an image - ". $check["mime"] ."');</script>");
        $uploadOk = 1;
    } 
    else {
        echo("<script>console.log('File is not an image.');</script>");
        $uploadOk = 0;
    }
}



// Check if file already exists
if (file_exists($target_file)) {
  echo("<script>console.log('Sorry, file already exists.');</script>");
  $uploadOk = 0;
}


// Check file size
if ($_FILES["file"]["size"] > 2097152) {
  echo("<script>console.log('Sorry, your file is too large.');</script>");
  $uploadOk = 0;
}

// Check file empty
if ($_FILES["file"]["size"] == 0) {
    
    if (file_exists($target_dir . $txtName . ".png")) {
  $uploadOk = 0;
}
else {
    copy($target_dir . "default.png", $target_dir . $txtName . ".png");
    $uploadOk = 0;
}
}

// Allow certain file formats
if($imageFileType != "jpg" && $imageFileType != "png" && $imageFileType != "jpeg" ) {
  echo("<script>console.log('Sorry, only JPG, JPEG, PNG files are allowed.');</script>");
  $uploadOk = 0;
}



// Check if $uploadOk is set to 0 by an error
if ($uploadOk == 0) {
  echo("<script>console.log('Sorry, your file was not uploaded.');</script>");
// if everything is ok, try to upload file
} else {
    move_uploaded_file($_FILES["file"]["tmp_name"], $target_dir.$txtName.".png");
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

$strSQL = 'SELECT `Id` FROM `WebApp` WHERE `Id` ORDER BY `Ordre`';

$result = mysqli_query($link, $strSQL);
$numResults = mysqli_num_rows($result);
$numResults = ++$numResults;

// database insert SQL code
$strSQL = 'INSERT INTO `WebApp` VALUES ( NULL, "'.$txtName.'",  "'.$txtLien.'", "'.$numResults.'", "'.$txtFrame.'")';
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

$strSQL = 'SELECT `Id` FROM `WebApp` WHERE `Id` ORDER BY `Ordre`';

$resultat = requeteSQL($strSQL);
$numResults = mysqli_num_rows($resultat);
$numResults = ++$numResults;

// database insert SQL code
$strSQL = 'UPDATE `WebApp` SET  Nom="'.$txtName.'",  Lien="'.$txtLien.'",  frame="'.$txtFrame.'" WHERE Id= '.$txtId.'';
// insert in database 
requeteSQL($strSQL);
}
}



if (isset($_POST['Delete'])) {
require("config.php");
$link = mysqli_connect($host, $user, $password, $dbname); 

$txtId = $_POST['idMenuAdd'];
$txtName = $_POST['Nom'];

$strSQL = 'SELECT `Id` FROM `WebApp` WHERE `Id` ORDER BY `Ordre`';
$resultat = requeteSQL($strSQL);
$numResults = mysqli_num_rows($resultat);
$numResults = ++$numResults;

// Delete Id SQL code
$strSQL = 'DELETE FROM `WebApp` WHERE `Id` = '.$txtId.';';
$strSQL.= 'SET  @num := 0;';
$strSQL.= 'UPDATE WebApp SET Id = @num := (@num+1);';
$strSQL.= 'ALTER TABLE WebApp AUTO_INCREMENT = 1';
        
// insert in database 
mysqli_multi_query($link, $strSQL);

$filename = ('img/'.$txtName . '.png');

unlink($filename);

}



function language($item_recherche, $groupe_recherche){
    
require('config.php');

$fichier="language/".$language.".ini";

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
?>















