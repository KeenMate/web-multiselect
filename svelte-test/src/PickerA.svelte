<script lang="ts">
  // Picker A — uses the legacy `on:event` directive only.
  import '@keenmate/web-multiselect';

  type Fruit = { value: string; label: string };
  const fruits: Fruit[] = [
    { value: 'apple',  label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' }
  ];

  let picker: any = $state();
  let log: string[] = $state([]);

  $effect(() => { if (picker) picker.options = fruits; });

  function push(kind: string, e: CustomEvent) {
    log = [...log, `${kind}: ${JSON.stringify(e.detail.selectedValues)}`];
    (window as any).__a ??= { select: [], deselect: [], change: [] };
    (window as any).__a[kind].push(e.detail);
  }
</script>

<web-multiselect
  id="picker-a"
  bind:this={picker}
  multiple="false"
  value-member="value"
  display-value-member="label"
  on:select={(e) => push('select', e as CustomEvent)}
  on:deselect={(e) => push('deselect', e as CustomEvent)}
  on:change={(e) => push('change', e as CustomEvent)}
></web-multiselect>
<pre id="log-a">{log.join('\n') || '(no events yet)'}</pre>
