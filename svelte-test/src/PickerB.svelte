<script lang="ts">
  // Picker B — uses the Svelte 5 `onevent` callback-prop syntax only.
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
    (window as any).__b ??= { select: [], deselect: [], change: [] };
    (window as any).__b[kind].push(e.detail);
  }
</script>

<web-multiselect
  id="picker-b"
  bind:this={picker}
  multiple="false"
  value-member="value"
  display-value-member="label"
  onselect={(e: any) => push('select', e as CustomEvent)}
  ondeselect={(e: any) => push('deselect', e as CustomEvent)}
  onchange={(e: any) => push('change', e as CustomEvent)}
></web-multiselect>
<pre id="log-b">{log.join('\n') || '(no events yet)'}</pre>
