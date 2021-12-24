<?php
header("Content-type: text/css; charset=UTF-8");
include ('../script/fonctions.php');
connexionDB();
?>

<?php
echo afficheTTargetPP();
?>

@media (any-hover: none) {
<?php
echo afficheTTargetP();
?>
}

<?php
echo affichePCss();
echo afficheTargetIconCss();
echo afficheTargetCss();
echo afficheIconCss();
?>
























