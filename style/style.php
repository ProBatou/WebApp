<?php
header("Content-type: text/css; charset=UTF-8");
include ('../script/fonctions.php');
connexionDB();
?>

<?php
echo afficheTTargetPP();
echo affichePCss();
echo afficheTargetIconCss();
echo afficheTargetCss();
echo afficheIconCss();
?>
