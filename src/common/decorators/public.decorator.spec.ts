import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('Public decorator', () => {
  it('debería definir metadata isPublic como true', () => {
    class TestController {
      @Public()
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      TestController.prototype.testMethod,
    );
    expect(metadata).toBe(true);
  });
});
