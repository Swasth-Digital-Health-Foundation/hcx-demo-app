import react from 'react';
import { Navbar, Container } from 'react-bootstrap';

const Nav = props => {
    return <>
        <Navbar bg="dark" variant="dark">
            <Container>
                <Navbar.Brand href="/">
                    <img
                        alt=""
                        src="hcx.png"
                        height="40"
                        className="d-inline-block align-top"
                    />{' '}
                </Navbar.Brand>
            </Container>
        </Navbar>
    </>
}

export default Nav;