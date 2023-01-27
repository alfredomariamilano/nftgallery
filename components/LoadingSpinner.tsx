import styles from '~/styles/LoadingSpinner.module.css'

export const LoadingSpinner = () => {
  return (
    <div className={styles.loadingSpinner}>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  )
}
