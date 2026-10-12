/**
 * HINCH MART — App Update Modal Proxy
 * Re-exports the unified production UpdateModal for backwards compatibility.
 */
import { UpdateModal, UpdateModalProps } from './update/UpdateModal';

export const AppUpdateModal = UpdateModal;
export type AppUpdateModalProps = UpdateModalProps;
export default UpdateModal;
