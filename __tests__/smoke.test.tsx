import React from 'react'
import { render } from '@testing-library/react'

function Dummy() {
  return <div>overlay</div>
}

it('renders test component', () => {
  const { getByText } = render(<Dummy />)
  expect(getByText('overlay')).toBeInTheDocument()
})
