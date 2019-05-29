<?php

/**
 * Provides a public-facing view for the plugin
 */
?>

<!-- This file should primarily consist of HTML with a little bit of PHP. -->
<?php if ($this->pub) { ?>
	<script>
	var bcforms_pub = <?php echo $this->pub ?>;
	</script>
	<script src="https://cdn.jsdelivr.net/gh/ethereum/web3.js/dist/web3.min.js"></script>
<?php } ?>