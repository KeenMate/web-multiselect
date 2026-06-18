<script lang="ts">
  import PickerA from './PickerA.svelte';
  import PickerB from './PickerB.svelte';
</script>

<h1>Svelte 5 — single-select event behavior</h1>
<p>Two pickers, single-mode. <strong>Picker A</strong> uses the legacy <code>on:event</code> directive.
   <strong>Picker B</strong> uses the Svelte 5 <code>onevent</code> callback-prop syntax.
   Pick "Apple" then "Banana" on each and watch the event log.</p>

<div class="picker-card">
  <h2>Picker A — <code>on:change</code> directive</h2>
  <PickerA />
</div>

<div class="picker-card">
  <h2>Picker B — <code>onchange</code> callback prop</h2>
  <PickerB />
</div>
