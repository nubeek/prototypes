/* Shared batch actions for selected table rows. Needs toolbar.css and
   proto-confirm-modal.js.

   <div class="toolbar-selection" id="..." hidden>
     <span class="toolbar-divider" aria-hidden="true"></span>
     <button class="ui-control ui-button ui-button-ghost filter-toggle-btn toolbar-btn" type="button" data-toolbar-selection-action="delete">
       <img class="toolbar-asset-icon toolbar-delete-icon" src="../../assets/icons/delete.svg" alt="" aria-hidden="true">
       Delete
     </button>
     ...other batch actions...
   </div>

   const selection = createToolbarSelection({
     container,
     noun: { one: "lead", other: "leads" },
     getSelectedCount() {},
     onBeforeDelete() {},
     onDelete(count) {}
   });
   selection.sync();

   Call sync() whenever the selection changes. Delete asks for confirmation,
   then calls onDelete. Other actions inside the group are wired by the page. */
(function () {
  function createToolbarSelection(options = {}) {
    const container = options.container;
    if (!(container instanceof HTMLElement)) return null;

    const deleteButton = container.querySelector('[data-toolbar-selection-action="delete"]');
    const noun = {
      one: options.noun?.one || "item",
      other: options.noun?.other || `${options.noun?.one || "item"}s`
    };
    let confirm = null;

    function selectedCount() {
      return Math.max(0, Number(options.getSelectedCount?.()) || 0);
    }

    function sync() {
      container.hidden = selectedCount() === 0;
    }

    function openDeleteConfirm() {
      const count = selectedCount();
      if (!count) return;
      options.onBeforeDelete?.();
      confirm = confirm || window.createProtoConfirmModal?.();
      confirm?.open({
        title: `Delete selected ${noun.other}?`,
        messageHtml: `Are you sure you want to delete<br><span class="toolbar-delete-confirm-count">the ${count} selected ${count === 1 ? noun.one : noun.other}?</span>`,
        cancelLabel: "Cancel",
        confirmLabel: "Delete",
        trigger: deleteButton,
        onConfirm() {
          options.onDelete?.(count);
        }
      });
    }

    deleteButton?.addEventListener("click", openDeleteConfirm);
    sync();

    return { sync, openDeleteConfirm };
  }

  window.createToolbarSelection = createToolbarSelection;
})();
