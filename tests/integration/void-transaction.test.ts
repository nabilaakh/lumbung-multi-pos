import { describe, it, expect } from 'vitest';
import { validateVoidReason } from '@/lib/services/transaction-service';

describe('Task 7: Void Transaction Rules (BR-08, BR-12)', () => {
  describe('TC-08 & TC-13: Void Reason Validation (Minimal 10 Karakter)', () => {
    it('should accept valid void reason >= 10 characters', () => {
      const reason = 'Salah input menu, pelanggan minta ganti menu';
      const result = validateVoidReason(reason);
      expect(result.valid).toBe(true);
      expect(result.errorMessage).toBeNull();
    });

    it('should reject empty or missing void reason', () => {
      expect(validateVoidReason('').valid).toBe(false);
      expect(validateVoidReason(null).valid).toBe(false);
      expect(validateVoidReason('   ').valid).toBe(false);
    });

    it('should reject void reason less than 10 characters (e.g., "batal", "salah")', () => {
      const shortReason = 'Batal beli'; // 10 chars? B-a-t-a-l- -b-e-l-i = 10 chars. Let's try 5 chars: 'Salah'
      const result = validateVoidReason('Salah');
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('minimal 10 karakter');
    });

    it('should reject exactly 9 characters', () => {
      const result = validateVoidReason('123456789');
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('minimal 10 karakter');
    });
  });
});
