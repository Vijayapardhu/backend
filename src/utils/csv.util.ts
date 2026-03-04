export function jsonToCsv(items: any[]): string {
    if (!items || !items.length) {
        return '';
    }

    // Get all unique keys from all objects to form the header
    const headerSet = new Set<string>();
    items.forEach(item => {
        Object.keys(item).forEach(key => headerSet.add(key));
    });

    const headers = Array.from(headerSet);

    const escapeCell = (val: any): string => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') {
            try {
                val = JSON.stringify(val);
            } catch (e) {
                val = String(val);
            }
        }
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const rows = items.map(item => {
        return headers.map(header => escapeCell(item[header])).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}
