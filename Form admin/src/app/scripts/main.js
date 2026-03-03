geotab.addin.formAdmin = function () {
  'use strict';

  const ADDIN_DATA_ID = 'aubcmTag5IkKkoaROSVpGdw';


  const SUBMISSION_ADDIN_ID = 'azc4ODM3ZTgtNGQ1Yi1jN2V';
  let api = null;
  let state = null;

  const _debugData = { templates: [] };
  let selectedTemplateId = null;


  let _submissions = [];
  let _submissionsFilter = '__all__';
  function $(sel) {
    return document.querySelector(sel);
  }

  function setLoading(isLoading) {
    const loading = $('#loading-state');
    const main = $('#main-content');
    if (!loading || !main) return;

    loading.classList.toggle('hidden', !isLoading);
    main.classList.toggle('hidden', isLoading);
  }

  function debugLog(msg) {
    const el = $('#debug-log');
    if (!el) return;
    el.textContent += '[' + new Date().toLocaleTimeString() + '] ' + msg + '\n';
    el.scrollTop = el.scrollHeight;
  }

  function addField(initial = { name: '', type: 'text' }) {
    const container = $('#fields-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'formAdmin-fieldRow field-row';

    row.innerHTML = `
    <input type="text" placeholder="Field Name" class="formAdmin-input f-name" />
    <select class="formAdmin-select f-type">
      <option value="text">Text</option>
      <option value="number">Number</option>
      <option value="date">Date</option>
      <option value="boolean">Checkbox</option>
    </select>
    <button type="button" class="formAdmin-removeBtn">×</button>
  `;

    row.querySelector('.f-name').value = initial.name || '';
    row.querySelector('.f-type').value = initial.type || 'text';

    row.querySelector('.formAdmin-removeBtn')
      .addEventListener('click', () => row.remove());

    container.appendChild(row);
  }

  function getFieldsFromUI() {
    const rows = document.getElementsByClassName('field-row');
    const fields = [];

    for (let i = 0; i < rows.length; i++) {
      const name = rows[i].querySelector('.f-name')?.value?.trim();
      const type = rows[i].querySelector('.f-type')?.value;

      if (name) fields.push({ name, type });
    }

    return fields;
  }
  function deleteSelectedForm() {
    if (!api) return;
    if (!selectedTemplateId) return;

    const name = $('#new-form-name')?.value?.trim() || 'this form';
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    setLoading(true);

    api.call(
      'Remove',
      {
        typeName: 'AddInData',
        entity: { id: selectedTemplateId }
      },
      function () {
        setLoading(false);
        exitEditMode();
        loadTemplates();
      },
      function (err) {
        setLoading(false);
        alert('Delete failed: ' + err);
      }
    );
  }
  function loadTemplates() {
    if (!api) return;

    setLoading(true);

    api.call(
      'Get',
      { typeName: 'AddInData', search: { addInId: ADDIN_DATA_ID } },
      function (results) {
        setLoading(false);
        _debugData.templates = results;

        const container = $('#templates-container');
        if (!container) return;

        if (!results.length) {
          container.textContent = 'No templates found.';
          return;
        }

        container.innerHTML = '';

        results.forEach(item => {
          const div = document.createElement('div');
          div.className = 'formAdmin-templateItem';

          const name = item.details?.formName || '(Unnamed)';
          const count = item.details?.fields?.length || 0;

          div.innerHTML = `
    <a href="#" class="formAdmin-templateLink">${name}</a>
    <span class="formAdmin-templateMeta">${count} fields</span>
  `;

          div.querySelector('.formAdmin-templateLink').addEventListener('click', (e) => {
            e.preventDefault();
            loadTemplateIntoEditor(item);
            $('#cancel-edit-btn')?.classList.remove('hidden');
            $('#delete-form-btn')?.classList.remove('hidden');
          });

          container.appendChild(div);
        });
      },
      function (err) {
        setLoading(false);
        debugLog('Load error: ' + err);
      }
    );
  }


  function loadTemplateIntoEditor(item) {
    selectedTemplateId = item.id;

    const nameEl = $('#new-form-name');
    if (nameEl) nameEl.value = item.details?.formName || '';

    const container = $('#fields-container');
    if (container) container.innerHTML = '';

    const fields = item.details?.fields || [];
    if (fields.length) {
      fields.forEach(f => addField({ name: f.name, type: f.type }));
    } else {
      addField();
    }
  }

  function saveForm() {
    if (!api) return;

    const formName = $('#new-form-name')?.value?.trim();
    if (!formName) {
      alert('Please enter a form name');
      return;
    }

    const fields = getFieldsFromUI();
    if (!fields.length) {
      alert('Add at least one field');
      return;
    }

    setLoading(true);

    const entity = {
      addInId: ADDIN_DATA_ID,
      details: { formName, fields }
    };

    if (selectedTemplateId) {
      entity.id = selectedTemplateId;

      api.call(
        'Set',
        { typeName: 'AddInData', entity },
        function () {
          setLoading(false);
          loadTemplates();
        },
        function (err) {
          setLoading(false);
          alert('Update failed: ' + err);
        }
      );
      return;
    }

    api.call(
      'Add',
      { typeName: 'AddInData', entity },
      function () {
        setLoading(false);
        selectedTemplateId = null;
        $('#new-form-name').value = '';
        $('#fields-container').innerHTML = '';
        addField();
        loadTemplates();
      },
      function (err) {
        setLoading(false);
        alert('Save failed: ' + err);
      }
    );
  }

  function exitEditMode() {
    selectedTemplateId = null;

    $('#cancel-edit-btn')?.classList.add('hidden');
    $('#delete-form-btn')?.classList.add('hidden');

    const nameEl = $('#new-form-name');
    if (nameEl) nameEl.value = '';

    const container = $('#fields-container');
    if (container) container.innerHTML = '';

    addField();
  }
  function bindUI() {
    $('#add-field-btn')?.addEventListener('click', addField);
    $('#save-form-btn')?.addEventListener('click', saveForm);
    $('#cancel-edit-btn')?.addEventListener('click', exitEditMode);
    $('#delete-form-btn')?.addEventListener('click', deleteSelectedForm);
    $('#export-csv-btn')?.addEventListener('click', exportFilteredSubmissionsToCsv);
  }

  function safeIsoToLocal(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleString();
    } catch (e) {
      return String(iso);
    }
  }
  function csvEscape(v) {
    const s = (v === null || v === undefined) ? '' : String(v);
    const needsQuotes = /[",\n\r]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  }

  function flattenValue(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (typeof v === 'number') return String(v);

    if (typeof v === 'string' && v.includes('T') && !isNaN(new Date(v))) {
      return safeIsoToLocal(v);
    }
    return String(v);
  }

  function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportFilteredSubmissionsToCsv() {
    if (_submissionsFilter === '__all__') {
      alert('Please filter by a specific Form Name before exporting.');
      return;
    }

    const rows = (_submissions || []).filter(s => (s?.details?.formName || '') === _submissionsFilter);

    if (!rows.length) {
      alert('No submissions found for the selected form.');
      return;
    }

    const dataKeysSet = new Set();
    rows.forEach(r => {
      const data = r?.details?.data || {};
      Object.keys(data).forEach(k => dataKeysSet.add(k));
    });
    const dataKeys = Array.from(dataKeysSet).sort((a, b) => a.localeCompare(b));

    const headers = [
      'submissionId',
      'timestamp',
      'formName',
      'userName',
      'vehicleName',
      'vin',
      ...dataKeys
    ];

    const lines = [];
    lines.push(headers.map(csvEscape).join(','));

    rows.forEach(r => {
      const details = r?.details || {};
      const ctx = details.context || {};
      const data = details.data || {};

      const line = [
        r?.id || '',
        flattenValue(details.timestamp || ''),
        details.formName || '',
        ctx.userName || '',
        ctx.vehicleName || '',
        ctx.vin || '',
        ...dataKeys.map(k => flattenValue(data[k]))
      ];

      lines.push(line.map(csvEscape).join(','));
    });

    const safeName = (_submissionsFilter || 'form')
      .replace(/[^\w\-]+/g, '_')
      .slice(0, 80);

    const filename = `${safeName}_submissions.csv`;
    downloadTextFile(filename, lines.join('\r\n'));
  }

  function updateSubmissionsFilterOptions() {
    const sel = $('#submissions-filter');
    if (!sel) return;

    const names = Array.from(new Set((_submissions || [])
      .map(s => s?.details?.formName)
      .filter(Boolean)))
      .sort((a, b) => String(a).localeCompare(String(b)));

    const current = _submissionsFilter || '__all__';

    sel.innerHTML = '';
    const allOpt = document.createElement('option');
    allOpt.value = '__all__';
    allOpt.textContent = 'All';
    sel.appendChild(allOpt);

    names.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n;
      opt.textContent = n;
      sel.appendChild(opt);
    });

    sel.value = names.includes(current) ? current : '__all__';
    _submissionsFilter = sel.value;

    const exportBtn = $('#export-csv-btn');
    if (exportBtn) exportBtn.disabled = (_submissionsFilter === '__all__');
  }

  function renderSubmissions() {
    const container = $('#submissions-container');
    if (!container) return;

    const filtered = (_submissions || []).filter(s => {
      if (_submissionsFilter === '__all__') return true;
      return (s?.details?.formName || '') === _submissionsFilter;
    });

    if (!filtered.length) {
      container.className = 'formAdmin-submissionsEmpty';
      container.textContent = 'No submissions found.';
      return;
    }

    container.className = '';
    container.innerHTML = '';

    const table = document.createElement('table');
    table.className = 'formAdmin-submissionsTable';

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th style="width: 180px;">Timestamp</th>
        <th>Form</th>
        <th style="width: 220px;">Driver</th>
        <th style="width: 220px;">Vehicle</th>
      </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    filtered.forEach((item, idx) => {
      const ts = item?.details?.timestamp || '';
      const formName = item?.details?.formName || '(Unnamed)';
      const driver = item?.details?.context?.userName || '';
      const vehicle = item?.details?.context?.vehicleName || '';
      const vin = item?.details?.context?.vin || item?.details?.context?.vehicleIdentificationNumber || '';

      const row = document.createElement('tr');
      row.className = 'formAdmin-subRow';
      row.innerHTML = `
        <td>${safeIsoToLocal(ts)}</td>
        <td>${formName}</td>
        <td>${driver}</td>
        <td>${vehicle}</td>
      `;

      // details row (collapsed by default)
      const detailsRow = document.createElement('tr');
      detailsRow.className = 'hidden';

      const detailsCell = document.createElement('td');
      detailsCell.colSpan = 4;
      detailsCell.className = 'formAdmin-subDetails';

      const detailsWrapper = document.createElement('div');

      const tsFormatted = safeIsoToLocal(ts);

      detailsWrapper.innerHTML = `
  <div style="margin-bottom:8px;">
    <div><strong>Form:</strong> ${formName}</div>
    <div><strong>Submitted:</strong> ${tsFormatted}</div>
    <div><strong>Driver:</strong> ${driver}</div>
    <div><strong>Vehicle:</strong> ${vehicle}</div>
    <div><strong>VIN:</strong> ${vin}</div>
  </div>
  <hr style="border:0;border-top:1px solid #e5e5e5;margin:8px 0;">
  <div style="font-weight:700;margin-bottom:6px;">Responses</div>
`;

      const data = item?.details?.data || {};

      Object.keys(data).forEach(key => {
        const value = data[key];

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.gap = '20px';
        row.style.padding = '4px 0';

        let displayValue = value;

        if (typeof value === 'boolean') {
          displayValue = value ? 'Yes' : 'No';
        }

        // Format ISO date strings
        if (typeof value === 'string' && value.includes('T') && !isNaN(new Date(value))) {
          displayValue = safeIsoToLocal(value);
        }

        row.innerHTML = `
    <div style="font-weight:600;">${key}</div>
    <div>${displayValue}</div>
  `;

        detailsWrapper.appendChild(row);
      });

      detailsCell.appendChild(detailsWrapper);
      detailsRow.appendChild(detailsCell);

      row.addEventListener('click', () => {
        detailsRow.classList.toggle('hidden');
      });

      tbody.appendChild(row);
      tbody.appendChild(detailsRow);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  function loadSubmissions() {
    if (!api) return;

    api.call(
      'Get',
      { typeName: 'AddInData', search: { addInId: SUBMISSION_ADDIN_ID }, resultsLimit: 200 },
      function (results) {
        _submissions = Array.isArray(results) ? results : [];

        // sort by timestamp desc (best-effort)
        _submissions.sort((a, b) => {
          const ta = new Date(a?.details?.timestamp || 0).getTime();
          const tb = new Date(b?.details?.timestamp || 0).getTime();
          return tb - ta;
        });

        _debugData.submissionsSample = _submissions.slice(0, 10);

        updateSubmissionsFilterOptions();
        renderSubmissions();
      },
      function (err) {
        debugLog('Submissions load error: ' + err);
        const container = $('#submissions-container');
        if (container) {
          container.className = 'formAdmin-submissionsEmpty';
          container.textContent = 'Error loading submissions.';
        }
      }
    );

    $('#submissions-filter')?.addEventListener('change', (e) => {
      _submissionsFilter = e.target.value || '__all__';
      const exportBtn = $('#export-csv-btn');
      if (exportBtn) exportBtn.disabled = (_submissionsFilter === '__all__');
      renderSubmissions();
    });
  }

  return {
    initialize: function (freshApi, freshState, callback) {
      api = freshApi;
      state = freshState;

      bindUI();
      addField();

      api.getSession(session => {
        const userEl = $('#formAdmin-user');
        if (userEl) userEl.textContent = session.userName;
      });

      loadTemplates();
      loadSubmissions();
      callback();
    },

    focus: function (freshApi) {
      api = freshApi;
      loadTemplates();
      loadSubmissions();
    },

    blur: function () { }
  };
};