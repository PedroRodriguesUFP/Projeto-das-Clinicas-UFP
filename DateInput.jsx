import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import { Portuguese } from 'flatpickr/dist/l10n/pt.js';
import 'flatpickr/dist/flatpickr.min.css';

const toDate = (yyyymmdd) => {
    if (!yyyymmdd) return null;
    const [y, m, d] = yyyymmdd.split('-').map(Number);
    return Number.isFinite(y) ? new Date(y, m - 1, d) : null;
};

export function DateInput({ name, value, onChange, required, disabled, min, max, className, style, title, id }) {
    const ref = useRef(null);
    const fp  = useRef(null);

    useEffect(() => {
        fp.current = flatpickr(ref.current, {
            locale: Portuguese,
            dateFormat: 'd/m/Y',
            allowInput: true,
            minDate: toDate(min),
            maxDate: toDate(max),
            onChange([date]) {
                if (!date) return;
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                onChange({ target: { name, value: `${y}-${m}-${d}` } });
            },
        });
        return () => fp.current?.destroy();
    }, []);

    useEffect(() => {
        if (!fp.current) return;
        const d = toDate(value);
        if (d) fp.current.setDate(d, false);
        else fp.current.clear();
    }, [value]);

    useEffect(() => {
        if (fp.current) {
            fp.current.set('minDate', toDate(min));
            fp.current.set('maxDate', toDate(max));
        }
    }, [min, max]);

    return (
        <input
            ref={ref}
            type="text"
            id={id}
            name={name}
            required={required}
            disabled={disabled}
            className={className}
            style={style}
            title={title}
        />
    );
}
