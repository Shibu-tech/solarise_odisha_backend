/**
 * Helper utility for the Document Correction Workflow
 */

export const DOC_TYPE_TO_ACTION_TYPE = {
    'electric_bill': 'electric_bill_name_correction',
    'bank_passbook': 'bank_passbook_name_correction',
    'land_ror': 'ownership_transfer',
    'aadhaar_card': 'ownership_transfer',
};

/**
 * Resolves the appropriate action type based on the document type.
 * @param {string} docType - The type of document (e.g., 'electric_bill')
 * @param {string} providedActionType - An optional action type provided by the user/system
 * @returns {string} The resolved action type
 */
export const resolveActionType = (docType, providedActionType = null) => {
    const VALID_ACTION_TYPES = [
        'electric_bill_name_correction',
        'ownership_transfer',
        'commercial_to_domestic',
        'bank_passbook_name_correction',
        'bank_passbook_update',
        'other'
    ];

    if (providedActionType && VALID_ACTION_TYPES.includes(providedActionType)) {
        return providedActionType;
    }

    return DOC_TYPE_TO_ACTION_TYPE[docType] || 'other';
};
