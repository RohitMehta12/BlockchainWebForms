<?php

/**
 * Provide a admin area view for the plugin
 */
?>

<!-- This file should primarily consist of HTML with a little bit of PHP. -->
<h1>Blockchain entries</h1>

<?php if( empty($this->pk)) { ?>
  <form method="post" action="options.php" id="keysGenerationForm">
    <?php settings_fields('bcforms' ); ?>
    <?php do_settings_sections( 'bcforms' ); ?>
    <table class="form-table">
      <tr valign="top">
      <td><input type="hidden" name="bcforms_pk" id="bcforms_pk"/></td>
      <td><input type="hidden" name="bcforms_pub" id="bcforms_pub"/></td>
      </tr>
    </table>
    <p>
    <?php submit_button('Generate Encryption Keys'); ?>
  </form>
<?php } else { ?>
  <p>Encryption keys are generated</p>
  <script>
    var bc_forms_pk = <?php echo $this->pk ?>;
  </script>
  <script src="https://cdn.jsdelivr.net/gh/ethereum/web3.js/dist/web3.min.js"></script>
  <script type="text/javascript" src="https://cdn.rawgit.com/afshinm/Json-to-HTML-Table/acad5489/json-to-table.js"></script>
  <section id="bcdata"></section>
<?php
}
?>
